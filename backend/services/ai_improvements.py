# AI improvements - Memory, multi-book search, adaptive models
from typing import List, Optional, Dict, Any
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from qdrant_client import QdrantClient
from qdrant_client.http import models
import os

class MemoryManager:
    """Manage conversation memory per book"""
    
    def __init__(self):
        self.memories: Dict[str, ConversationBufferMemory] = {}
    
    def get_memory(self, session_id: str) -> ConversationBufferMemory:
        """Get or create memory for session"""
        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
        return self.memories[session_id]
    
    def clear_memory(self, session_id: str):
        """Clear memory for session"""
        if session_id in self.memories:
            del self.memories[session_id]
    
    def get_conversation_history(self, session_id: str) -> List[Dict]:
        """Get conversation history"""
        memory = self.get_memory(session_id)
        return memory.chat_memory.messages

memory_manager = MemoryManager()

class AdaptiveModelRouter:
    """Route requests to different AI models based on availability"""
    
    def __init__(self):
        self.primary_model = "gemini"
        self.fallback_order = ["gemini", "gpt4", "claude"]
        
        self.models = {
            "gemini": {
                "chat": lambda: ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash-exp",
                    google_api_key=os.getenv("GOOGLE_API_KEY"),
                    temperature=0.7
                ),
                "embedding": lambda: GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001",
                    google_api_key=os.getenv("GOOGLE_API_KEY")
                )
            },
            "gpt4": {
                "chat": lambda: ChatOpenAI(
                    model="gpt-4-turbo-preview",
                    api_key=os.getenv("OPENAI_API_KEY"),
                    temperature=0.7
                ),
                "embedding": None  # Use Gemini embeddings
            },
            "claude": {
                "chat": lambda: ChatAnthropic(
                    model="claude-3-opus-20240229",
                    api_key=os.getenv("ANTHROPIC_API_KEY"),
                    temperature=0.7
                ),
                "embedding": None  # Use Gemini embeddings
            }
        }
    
    async def get_chat_model(self):
        """Get available chat model with fallback"""
        for model_name in self.fallback_order:
            try:
                if model_name == "gemini" and os.getenv("GOOGLE_API_KEY"):
                    return self.models[model_name]["chat"]()
                elif model_name == "gpt4" and os.getenv("OPENAI_API_KEY"):
                    return self.models[model_name]["chat"]()
                elif model_name == "claude" and os.getenv("ANTHROPIC_API_KEY"):
                    return self.models[model_name]["chat"]()
            except Exception as e:
                print(f"Failed to initialize {model_name}: {e}")
                continue
        
        raise Exception("No AI model available")
    
    async def get_embedding_model(self):
        """Get embedding model (always Gemini for consistency)"""
        return self.models["gemini"]["embedding"]()

model_router = AdaptiveModelRouter()

class MultiBookSearch:
    """Search across multiple books simultaneously"""
    
    def __init__(self, qdrant_client: QdrantClient):
        self.qdrant = qdrant_client
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
    
    async def search_across_books(
        self,
        book_ids: List[str],
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search across multiple books"""
        
        # Generate query embedding
        query_embedding = self.embedding_model.embed_query(query)
        
        all_results = []
        
        for book_id in book_ids:
            try:
                # Search in each book's collection
                results = self.qdrant.search(
                    collection_name=f"book_{book_id}",
                    query_vector=query_embedding,
                    limit=limit
                )
                
                for result in results:
                    all_results.append({
                        "book_id": book_id,
                        "score": result.score,
                        "text": result.payload.get("text", ""),
                        "page": result.payload.get("page", 0),
                        "metadata": result.payload.get("metadata", {})
                    })
            except Exception as e:
                print(f"Error searching book {book_id}: {e}")
                continue
        
        # Sort by score
        all_results.sort(key=lambda x: x["score"], reverse=True)
        
        return all_results[:limit]
    
    async def generate_multi_book_answer(
        self,
        book_ids: List[str],
        query: str,
        book_titles: Dict[str, str]
    ) -> str:
        """Generate answer from multiple books"""
        
        # Search across books
        results = await self.search_across_books(book_ids, query, limit=15)
        
        if not results:
            return "I couldn't find relevant information in these books."
        
        # Build context from multiple books
        context = ""
        for result in results:
            book_title = book_titles.get(result["book_id"], "Unknown Book")
            context += f"\n[From '{book_title}', page {result['page']}]:\n{result['text']}\n"
        
        # Generate answer
        chat_model = await model_router.get_chat_model()
        
        prompt = f"""You are analyzing multiple books to answer a question.

Context from multiple books:
{context}

Question: {query}

Provide a comprehensive answer that:
1. Synthesizes information from all relevant books
2. Cites which book each insight comes from
3. Highlights agreements and disagreements between books
4. Provides a balanced perspective

Answer:"""
        
        response = await chat_model.ainvoke(prompt)
        return response.content

class SmartSummarizer:
    """Generate smart book summaries"""
    
    def __init__(self):
        self.chat_model = None
    
    async def initialize(self):
        """Initialize chat model"""
        self.chat_model = await model_router.get_chat_model()
    
    async def generate_summary(
        self,
        book_text: str,
        summary_type: str = "comprehensive"
    ) -> Dict[str, str]:
        """Generate different types of summaries"""
        
        if not self.chat_model:
            await self.initialize()
        
        # Truncate text if too long (keep first and last parts)
        max_length = 50000
        if len(book_text) > max_length:
            middle_point = max_length // 2
            book_text = book_text[:middle_point] + "\n...[content truncated]...\n" + book_text[-middle_point:]
        
        summaries = {}
        
        # Short summary (2-3 sentences)
        if summary_type in ["short", "comprehensive"]:
            prompt = f"""Provide a 2-3 sentence summary of this book:

{book_text[:10000]}

Summary:"""
            response = await self.chat_model.ainvoke(prompt)
            summaries["short"] = response.content
        
        # Long summary (2-3 paragraphs)
        if summary_type in ["long", "comprehensive"]:
            prompt = f"""Provide a detailed 2-3 paragraph summary of this book covering:
- Main themes and ideas
- Key arguments or plot points
- Important takeaways

Book text:
{book_text[:20000]}

Summary:"""
            response = await self.chat_model.ainvoke(prompt)
            summaries["long"] = response.content
        
        # Key topics
        if summary_type in ["topics", "comprehensive"]:
            prompt = f"""List the 5-10 most important topics covered in this book:

{book_text[:15000]}

Format as a JSON array of strings.

Topics:"""
            response = await self.chat_model.ainvoke(prompt)
            summaries["topics"] = response.content
        
        # Best quotes
        if summary_type in ["quotes", "comprehensive"]:
            prompt = f"""Extract 5-10 of the most powerful and memorable quotes from this book:

{book_text[:20000]}

Format as a JSON array of objects with "quote" and "context" fields.

Quotes:"""
            response = await self.chat_model.ainvoke(prompt)
            summaries["quotes"] = response.content
        
        return summaries
    
    async def generate_seo_metadata(self, book_title: str, author: str, summary: str) -> Dict[str, str]:
        """Generate SEO-optimized metadata"""
        
        if not self.chat_model:
            await self.initialize()
        
        prompt = f"""Generate SEO metadata for this book:

Title: {book_title}
Author: {author}
Summary: {summary}

Provide:
1. SEO Title (50-60 characters)
2. Meta Description (150-160 characters)
3. URL Slug (lowercase, hyphens)

Format as JSON.

Metadata:"""
        
        response = await self.chat_model.ainvoke(prompt)
        
        # Parse JSON response
        import json
        try:
            metadata = json.loads(response.content)
            return metadata
        except:
            return {
                "seo_title": f"{book_title} by {author} - AI Book Summary",
                "seo_description": summary[:160],
                "slug": book_title.lower().replace(" ", "-")[:50]
            }

smart_summarizer = SmartSummarizer()
