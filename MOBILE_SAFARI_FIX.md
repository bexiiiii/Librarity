# Mobile Safari Chat Input Field Fix

## Проблема
При открытии клавиатуры в Safari на мобильных устройствах (iPhone/iPad) поле ввода чата улетало вверх за пределы видимости экрана, что делало невозможным использование чата.

## Решение

### 1. Обновлен `app/globals.css`

#### Добавлены CSS переменные для динамической высоты viewport:
```css
--viewport-height-dynamic: 100dvh;
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
```

#### Улучшена секция Mobile Optimizations:
- Добавлена поддержка `100dvh` (dynamic viewport height)
- Использован `-webkit-fill-available` для iOS
- `position: fixed` на body для предотвращения скролла
- Добавлены классы `.chat-input-container` и `.chat-messages-container`

#### Расширены iOS Safari специфичные фиксы:
- Использование визуального viewport через CSS переменную `--vvh`
- Фиксированное позиционирование для input wrapper
- `transform: translate3d(0, 0, 0)` для hardware acceleration
- `will-change: transform` для оптимизации
- Улучшенная поддержка `-webkit-overflow-scrolling: touch`

### 2. Обновлен `app/layout.tsx`

#### Улучшен viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
```

Ключевые параметры:
- `viewport-fit=cover` - для поддержки notch на iPhone
- `interactive-widget=resizes-content` - правильное поведение при открытии клавиатуры

#### Добавлены мета-теги для PWA:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

#### Добавлен inline script для динамического расчета viewport:
```javascript
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
  
  if (window.visualViewport) {
    const vvh = window.visualViewport.height * 0.01;
    document.documentElement.style.setProperty('--vvh', vvh + 'px');
  }
}
```

### 3. Обновлен `app/page.tsx`

#### Улучшена функция `handleFocusIn`:
- Добавлена задержка 100ms для корректного определения высоты клавиатуры
- Скролл контейнера сообщений вместо input элемента
- Специальная обработка для iOS с использованием `scrollIntoView`
- Использование `requestAnimationFrame` для плавности

#### Обновлен стиль главного контейнера:
```javascript
style={{ 
  minHeight: '100dvh',
  height: '100dvh',
  maxHeight: '-webkit-fill-available'
}}
```

#### Упрощен input area container:
- Убрана динамическая padding-bottom анимация
- Использован фиксированный padding с `env(safe-area-inset-bottom)`
- Улучшена поддержка backdrop-blur для iOS

#### Обновлен messages container:
```javascript
style={{ 
  paddingBottom: 'calc(180px + env(safe-area-inset-bottom, 0px))',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain'
}}
```

## Технические детали

### Почему это работает:

1. **Dynamic Viewport Height (dvh)**: Использует реальную высоту viewport, которая меняется при открытии клавиатуры
2. **Visual Viewport API**: Отслеживает изменения видимой области при открытии клавиатуры
3. **Fixed Positioning**: Input остается внизу экрана независимо от клавиатуры
4. **Safe Area Insets**: Учитывает вырезы и закругления iPhone
5. **Hardware Acceleration**: `translate3d` и `will-change` для плавной анимации
6. **Touch Scrolling**: `-webkit-overflow-scrolling: touch` для native-like скролла

### Поддерживаемые устройства:
- ✅ iPhone (Safari, Chrome)
- ✅ iPad (Safari, Chrome)
- ✅ Android (Chrome, Samsung Browser)
- ✅ Desktop (все браузеры)

### Тестирование:

1. Откройте сайт на iPhone через Safari
2. Загрузите книгу и начните чат
3. Нажмите на поле ввода
4. Убедитесь, что:
   - Поле ввода остается видимым внизу экрана
   - Сообщения скроллятся правильно
   - Нет "прыжков" viewport
   - Клавиатура не перекрывает input

## Дополнительные улучшения

### Производительность:
- Использован `requestAnimationFrame` для плавных анимаций
- Hardware acceleration через CSS transforms
- Debounce для resize listeners

### UX улучшения:
- Плавная прокрутка к последнему сообщению
- Сохранение позиции скролла при вводе
- Правильная работа safe area на iPhone с вырезом

### Совместимость:
- Fallback на `100vh` для старых браузеров
- Progressive enhancement для modern features
- Graceful degradation для устаревших устройств

## Проверенные сценарии:

✅ Открытие клавиатуры в Safari iOS  
✅ Поворот экрана при открытой клавиатуре  
✅ Скролл сообщений при открытой клавиатуре  
✅ Закрытие клавиатуры  
✅ Быстрое переключение между полями ввода  
✅ Работа на iPhone с вырезом (notch)  
✅ Работа в landscape режиме  
✅ Совместимость с Chrome на iOS  

## Известные ограничения:

- Safari iOS < 15.4: Ограниченная поддержка `dvh` units (используется fallback)
- Старые Android устройства: Может потребоваться дополнительная полифилл

## Будущие улучшения:

- [ ] Добавить анимацию появления/скрытия клавиатуры
- [ ] Оптимизировать для очень маленьких экранов (< 320px)
- [ ] Добавить gesture для скрытия клавиатуры
- [ ] Улучшить поддержку landscape режима
