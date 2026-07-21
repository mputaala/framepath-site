// Registers the <altcha-widget> custom element in React's JSX namespace
// (US-213). The altcha package ships its own React type augmentations; this
// side-effect import pulls them into the program so SupportForm.tsx can
// render <altcha-widget> without a local declaration.
import "altcha/types/react";
