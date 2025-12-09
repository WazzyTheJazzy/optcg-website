# SuccessToast Component

## Overview

The `SuccessToast` component displays success notifications to users when actions complete successfully. It provides visual feedback for card plays, attacks, DON attachments, and other successful game actions.

## Features

- **Auto-dismiss**: Automatically dismisses after 2 seconds
- **Green styling**: Uses green color scheme to indicate success
- **Checkmark icon**: Visual checkmark icon for quick recognition
- **Manual dismiss**: Users can manually dismiss by clicking the X button
- **Smooth animations**: Fade-in and slide-in animations for polished UX

## Usage

```tsx
import { SuccessToast } from './SuccessToast';

function MyComponent() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  return (
    <>
      {/* Your component content */}
      
      <SuccessToast
        message={successMessage}
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `string \| null` | Yes | The success message to display |
| `visible` | `boolean` | Yes | Whether the toast is visible |
| `onDismiss` | `() => void` | Yes | Callback when the toast should be dismissed |

## Success Messages

The component is used throughout the game to show success feedback for:

### Card Playing
- "Monkey D. Luffy played successfully!"
- Shows when a card is successfully played from hand to the board

### Attacks
- "Roronoa Zoro attacked Kaido! (5000 vs 3000)"
- "Monkey D. Luffy attacked Kaido! Dealt 1 life damage."
- Shows attacker and target names with power comparison or life damage

### DON Attachment
- "DON attached to Nami! Power +1000"
- Shows character name and power increase

## Styling

The toast uses Tailwind CSS classes for styling:
- Green background (`bg-green-600`)
- White text
- Rounded corners
- Shadow for depth
- Fixed positioning at top center of screen

## Animation

The toast uses CSS animations for smooth appearance:
- `animate-in`: Fade-in animation
- `fade-in`: Opacity transition
- `slide-in-from-top-2`: Slides down from top

## Auto-dismiss Behavior

The toast automatically dismisses after 2 seconds using a `setTimeout` in a `useEffect` hook. The timer is cleaned up if the component unmounts or if the message changes before the timeout completes.

## Accessibility

- Uses semantic HTML with proper ARIA labels
- Dismiss button has `aria-label="Dismiss success message"`
- High contrast colors for readability
- Clear visual indicators (checkmark icon)

## Related Components

- `ErrorToast`: Similar component for error messages (red styling, 3-second timeout)
- `GameBoard`: Main consumer of SuccessToast for game actions
