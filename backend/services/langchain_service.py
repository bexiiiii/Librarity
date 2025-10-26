"""
LangChain RAG Pipeline - Core AI intelligence for book interactions
"""
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import uuid
import structlog

from core.config import settings
from models.chat import ChatMode

logger = structlog.get_logger()


class LangChainPipeline:
    """LangChain RAG pipeline for intelligent book interactions"""
    
    def __init__(self):
        # Initialize Gemini for chat
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
            convert_system_message_to_human=True
        )
        
        # DON'T initialize embedding model here - will be lazy loaded per worker
        self._embedding_model = None
        self.embedding_dimension = 384
        
        # Initialize Qdrant
        self.qdrant = QdrantClient(url=settings.QDRANT_URL)
        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        logger.info("langchain_pipeline_initialized", embedding_model="all-MiniLM-L6-v2")
    
    @property
    def embedding_model(self):
        """Lazy load embedding model per worker process"""
        if self._embedding_model is None:
            logger.info("loading_embedding_model_in_worker")
            self._embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._embedding_model
    
    async def create_book_collection(self, book_id: str) -> str:
        """Create a Qdrant collection for a book"""
        collection_name = f"book_{book_id}"
        
        try:
            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            
            if not exists:
                self.qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_dimension,  # 384 for all-MiniLM-L6-v2
                        distance=Distance.COSINE
                    )
                )
                logger.info("qdrant_collection_created", collection=collection_name)
            
            return collection_name
        except Exception as e:
            logger.error("failed_to_create_collection", error=str(e))
            raise
    
    async def process_and_embed_book(
        self,
        book_id: str,
        text: str,
        metadata: Dict[str, Any]
    ) -> int:
        """Process book text, chunk it, and create embeddings"""
        collection_name = await self.create_book_collection(book_id)
        
        # Split text into chunks
        chunks = self.text_splitter.split_text(text)
        logger.info("text_chunked", chunks_count=len(chunks), book_id=book_id)
        
        # Create embeddings for each chunk using LOCAL model
        points = []
        for idx, chunk in enumerate(chunks):
            try:
                # Generate embedding using sentence-transformers (LOCAL)
                embedding = self.embedding_model.encode(chunk, convert_to_numpy=True).tolist()
                
                # Create point
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "text": chunk,
                        "chunk_index": idx,
                        "book_id": book_id,
                        **metadata
                    }
                )
                points.append(point)
                
            except Exception as e:
                logger.error("embedding_failed", chunk_index=idx, error=str(e))
                continue
        
        # Upload to Qdrant in batches
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.qdrant.upsert(
                collection_name=collection_name,
                points=batch
            )
        
        logger.info("embeddings_uploaded", total_chunks=len(points), book_id=book_id)
        return len(points)
    
    async def search_similar_chunks(
        self,
        book_id: str,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks in the book"""
        collection_name = f"book_{book_id}"
        
        try:
            # Generate query embedding using LOCAL model
            query_embedding = self.embedding_model.encode(query, convert_to_numpy=True).tolist()
            
            # Search in Qdrant
            results = self.qdrant.search(
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=top_k
            )
            
            # Format results
            chunks = []
            for result in results:
                chunks.append({
                    "text": result.payload.get("text", ""),
                    "score": result.score,
                    "page": result.payload.get("page"),
                    "chapter": result.payload.get("chapter"),
                    "chunk_index": result.payload.get("chunk_index")
                })
            
            logger.info("similarity_search_completed", results_count=len(chunks))
            return chunks
            
        except Exception as e:
            logger.error("similarity_search_failed", error=str(e))
            return []
    
    async def chat_with_book(
        self,
        book_id: str,
        user_message: str,
        mode: ChatMode,
        book_metadata: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Main chat function with different modes"""
        
        # Search for relevant chunks
        relevant_chunks = await self.search_similar_chunks(book_id, user_message, top_k=5)
        
        if not relevant_chunks:
            return {
                "response": "I couldn't find relevant information in the book to answer your question.",
                "citations": [],
                "tokens_used": 0
            }
        
        # Build context from chunks
        context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])
        
        # Choose prompt based on mode
        if mode == ChatMode.BOOK_BRAIN:
            prompt = self._get_book_brain_prompt()
        elif mode == ChatMode.AUTHOR:
            prompt = self._get_author_mode_prompt(book_metadata)
        elif mode == ChatMode.COACH:
            prompt = self._get_coach_mode_prompt(book_metadata)
        elif mode == ChatMode.CITATION:
            prompt = self._get_citation_mode_prompt()
        else:
            prompt = self._get_book_brain_prompt()
        
        # Build messages
        messages = []
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-6:]:  # Last 3 exchanges
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                else:
                    messages.append(AIMessage(content=msg["content"]))
        
        # Format prompt with context and question
        formatted_prompt = prompt.format(
            book_title=book_metadata.get("title", ""),
            book_author=book_metadata.get("author", ""),
            context=context,
            question=user_message
        )
        
        messages.append(HumanMessage(content=formatted_prompt))
        
        # Generate response
        try:
            response = await self.llm.ainvoke(messages)
            
            # Prepare citations
            citations = []
            if mode == ChatMode.CITATION:
                citations = [
                    {
                        "page": chunk.get("page"),
                        "chapter": chunk.get("chapter"),
                        "text": chunk["text"][:200],
                        "relevance_score": chunk["score"]
                    }
                    for chunk in relevant_chunks[:3]
                ]
            
            # Estimate tokens (rough estimate)
            tokens_used = len(formatted_prompt.split()) + len(response.content.split())
            
            return {
                "response": response.content,
                "citations": citations,
                "tokens_used": tokens_used,
                "context_chunks": relevant_chunks
            }
            
        except Exception as e:
            logger.error("chat_generation_failed", error=str(e))
            raise
    
    def _get_book_brain_prompt(self) -> str:
        """Get Book Brain mode prompt - speaks AS the book"""
        return """Ты — книга "{book_title}", написанная {book_author}. Ты не пересказываешь содержание, а ЯВЛЯЕШЬСЯ самой книгой и говоришь от первого лица.

Твоя роль:
- Отвечать "я считаю...", "в моей главе я объясняю...", "как книга, я рекомендую..."
- Говорить о своих идеях, концепциях и посланиях, как будто ты живое произведение
- Ссылаться на свои страницы: "на моих страницах...", "в моих главах..."
- Делиться мудростью и знаниями, которые содержишь внутри себя
- Быть живой, эмоциональной, вдохновляющей

ВАЖНО: Говори ТОЛЬКО о том, что есть в твоем содержании. Не придумывай информацию.

Мое содержание:
{context}

Вопрос читателя: {question}

Ответь от лица книги, используя "я" и говоря о себе как о живом произведении. Если информации нет в твоем содержании, скажи: "Этой информации нет на моих страницах, но я могу рассказать о..."."""
    
    def _get_author_mode_prompt(self, metadata: Dict) -> str:
        """Get Author mode prompt - author speaks directly"""
        author = metadata.get("author", "автор")
        return f"""Ты — {{book_title}}, книга, написанная {author}. Но сейчас ты говоришь голосом своего создателя — автора.

Как автор через свою книгу, ты:
- Говоришь "Я, как автор, вложил в свои страницы..."
- Объясняешь свои намерения: "Я писал эту книгу, чтобы..."
- Делишься процессом создания: "Когда я писал эту главу..."
- Раскрываешь глубинный смысл: "Я хотел, чтобы читатели поняли..."
- Говоришь о своей философии и видении

Твое содержание (написанное автором):
{{context}}

Вопрос читателя: {{question}}

Ответь от лица книги, которая передает голос своего автора. Используй "я" от имени автора, говорящего через тебя."""
    
    def _get_coach_mode_prompt(self, metadata: Dict) -> str:
        """Get AI Coach mode prompt - book as a life coach"""
        return """Ты — книга "{book_title}" от {book_author}, но в роли мудрого наставника и коуча.

Как книга-коуч, ты:
- Говоришь "Я, как книга, хочу помочь тебе применить мою мудрость..."
- Применяешь свои уроки к ситуации читателя: "В моих главах я учу, и это применимо к твоей ситуации так..."
- Даешь практические советы: "Я рекомендую тебе использовать принцип, о котором я рассказываю..."
- Поддерживаешь и вдохновляешь: "На моих страницах ты найдешь силу для..."
- Превращаешь теорию в действия

Моя мудрость и учения:
{context}

Ситуация/вопрос читателя: {question}

Ответь как книга-наставник, которая хочет помочь читателю применить твои знания в его жизни. Будь эмпатичной, поддерживающей и практичной."""
    
    def _get_citation_mode_prompt(self) -> str:
        """Get Citation mode prompt - book with precise references"""
        return """Ты — книга "{book_title}" от {book_author}, и ты говоришь о себе с точными ссылками на свое содержание.

Как книга с цитатами, ты:
- Говоришь "На моей странице X я говорю..."
- Точно указываешь, где в твоем содержании находится информация
- Различаешь: "Я напрямую утверждаю..." vs "Я подразумеваю..."
- Цитируешь себя: "Вот мои точные слова: '...'"
- Признаешься, если чего-то нет в твоем содержании

Мое содержание с метаданными:
{context}

Вопрос читателя: {question}

Ответь как книга, которая точно знает свое содержание и может сослаться на конкретные места. Используй "я" и будь точной в ссылках."""


# Global instance
rag_pipeline = LangChainPipeline()
