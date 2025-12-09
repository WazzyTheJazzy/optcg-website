# ErrorToast Component

## Overview

The `ErrorToast` component displays error messages as a fixed-position toast notification at the top of the screen. It provides visual feedback for invalid actions and automatically dismisses after 3 seconds.

## Features

- **Fixed Position**: Appears at the top center of the screen
- **Auto-Dismiss**: Automatically disappears after 3 seconds
- **Manual Dismiss**: Users can click the X button to dismiss immediately
- **Smooth Animations**: Fades in and slides down when appearing
- **Accessible**: Includes ARIA labels and keyboard support

## Usage

```tsx
import { ErrorToast } from './ErrorToast';

function MyComponent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
  };

  return (
    <>
      {/* Your component content */}
      
      <ErrorToast
        message={errorMessage}
        visible={!!errorMessage}
        onDismiss={() => setErrorMessage(null)}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string \| null` | Yes | The error message to display |
| `visible` | `boolean` | Yes | Whether the toast is visible |
| `onDismiss` | `() => void` | Yes | Callback when the toast should be dismissed |

## Integration with GameBoard

The `ErrorToast` component is integrated into the `GameBoard` component to display error messages for:

- **Invalid card plays**: Insufficient DON, character area full, wrong phase
- **Invalid attacks**: Rested character, invalid target
- **Invalid DON attachment**: No active DON, rested DON
- **Phase errors**: Actions during wrong phase, not player's turn

### Example Error Messages

- "Insufficient DON! Need 5 DON but only have 3 active DON."
- "Character area is full (5/5). Cannot play more character cards."
- "Character is rested and cannot attack"
- "Cannot play cards during DRAW phase. Click 'Continue' to reach Main Phase."
- "No active DON cards available"

## Styling

The component uses Tailwind CSS classes for styling:
- Red background (`bg-red-600`) for error indication
- White text for contrast
- Shadow and rounded corners for depth
- Smooth animations for appearance/disappearance

## Accessibility

- Includes an error icon for visual indication
- Close button has `aria-label="Dismiss error"`
- Keyboard accessible (can be dismissed with click or auto-dismiss)

## Auto-Dismiss Behavior

The toast automatically dismisses after 3 seconds using a `useEffect` hook:

```tsx
useEffect(() => {
  if (visible && message) {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [visible, message, onDismiss]);
```

This ensures that:
1. The timer is set when the toast becomes visible
2. The timer is cleared if the component unmounts or props change
3. Users can still manually dismiss before the 3 seconds expire

## Requirements Satisfied

This component satisfies the following requirements from the spec:

- **Requirement 5.4**: Display error messages when actions fail
- **Task 8.1**: Create ErrorToast component with auto-dismiss
- **Task 8.2**: Integrate with GameBoard error state
- **Task 8.3**: Display specific error messages for all actions
