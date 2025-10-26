# Sidebar Component - Инструкция

## ✨ Возможности

### 🎯 Основной функционал
- ✅ Открытие/закрытие сайдбара
- ✅ История чатов с реальными данными из API
- ✅ Поиск по чатам
- ✅ Профиль пользователя (показывается только для авторизованных)
- ✅ Адаптивный дизайн для мобильных и десктопа

### 📱 Мобильная адаптация
- На мобильных (< 768px):
  - Сайдбар закрыт по умолчанию
  - Полноэкранный оверлей при открытии
  - Автозакрытие при выборе чата
  - Кнопка меню в левом верхнем углу
  
- На десктопе (≥ 768px):
  - Сайдбар открыт по умолчанию
  - Кнопка закрытия внутри сайдбара
  - Основной контент адаптируется при открытии/закрытии
  - Нет оверлея

### 🔐 Условное отображение профиля
- Профиль отображается только если:
  - `isAuthenticated === true`
  - `user !== null`
- Если пользователь не вошел, нижняя секция с профилем скрыта

## 🎨 Дизайн

Полностью соответствует дизайну основной страницы:
- Backdrop blur эффекты
- Gradient кнопки и иконки
- Плавные анимации с Framer Motion
- Прозрачные белые/[0.02-0.05] фоны
- Violet-Indigo градиенты

## 🔧 Использование

```tsx
import { Sidebar } from '@/components/ui/sidebar';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex">
      <Sidebar 
        isOpen={isSidebarOpen}
        onToggle={setIsSidebarOpen}
        onNewChat={() => console.log('New chat')}
        onSelectChat={(id) => console.log('Selected:', id)}
      />
      
      <main className="flex-1">
        {/* Ваш контент */}
      </main>
    </div>
  );
}
```

## 📊 API Integration

Компонент использует следующие API endpoints:
- `GET /api/auth/me` - получение текущего пользователя
- `GET /api/chat/sessions` - получение истории чатов

## 🎯 Props

```typescript
interface SidebarProps {
  isOpen: boolean;              // Состояние открытия сайдбара
  onToggle: (open: boolean) => void; // Обработчик переключения
  onNewChat?: () => void;       // Callback при создании нового чата
  onSelectChat?: (sessionId: string) => void; // Callback при выборе чата
}
```

## 📱 Breakpoints

- Mobile: `< 768px` (md breakpoint)
- Desktop: `≥ 768px`

## 🎭 Анимации

Все анимации реализованы через Framer Motion:
- Плавное открытие/закрытие (spring animation)
- Hover эффекты на кнопках
- Fade in/out для оверлея
- Staggered animations для списка чатов

## 🛠 Зависимости

- `framer-motion` - анимации
- `lucide-react` - иконки
- `next/link` - навигация
- Custom API client (`@/lib/api`)
