import { useCallback, useRef, useState, type AriaAttributes } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import "../../styles/select.css";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
} & Pick<
  AriaAttributes,
  "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid"
>;

// Radix reserves the empty string for its placeholder state. Values are
// encoded before they reach Radix so an application value can safely be "".
const EMPTY_VALUE = "__surtario_select_empty__";
const VALUE_PREFIX = "__surtario_select_value__";

function toInternalValue(value: string) {
  return value === ""
    ? EMPTY_VALUE
    : `${VALUE_PREFIX}${encodeURIComponent(value)}`;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  id,
  name,
  disabled = false,
  required = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? "",
  );
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const currentValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find(
    (option) => option.value === currentValue,
  );
  const internalOptions = options.map((option) => ({
    ...option,
    internalValue: toInternalValue(option.value),
  }));
  const internalValue = selectedOption
    ? toInternalValue(currentValue)
    : undefined;
  const invalid = ariaInvalid === true || ariaInvalid === "true";

  // A Radix portal defaults to document.body, which sits outside a native
  // dialog's top layer. Keep the listbox in its closest dialog when present.

  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (node) {
      const dialog = node.closest("dialog");
      setPortalContainer(dialog instanceof HTMLElement ? dialog : null);
    }
  }, []);

  return (
    <div
      className="surtario-select"
      data-disabled={disabled ? "true" : undefined}
      data-invalid={invalid ? "true" : undefined}
    >
      <SelectPrimitive.Root
        value={internalValue}
        defaultValue={
          !isControlled ? toInternalValue(defaultValue ?? "") : undefined
        }
        onValueChange={(nextValue) => {
          const option = internalOptions.find(
            (candidate) => candidate.internalValue === nextValue,
          );
          if (option) {
            if (!isControlled) setUncontrolledValue(option.value);
            onValueChange?.(option.value);
          }
        }}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={setTriggerRef}
          id={id}
          className="surtario-select-trigger"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        >
          <SelectPrimitive.Value placeholder="Choose an option">
            {selectedOption?.label}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="surtario-select-icon" aria-hidden>
            <ChevronDown size={17} strokeWidth={2.2} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal
          container={
            portalContainer ??
            triggerRef.current?.closest("dialog") ??
            undefined
          }
        >
          <SelectPrimitive.Content
            className="surtario-select-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="surtario-select-scroll-button">
              <ChevronUp size={16} aria-hidden />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="surtario-select-viewport">
              {internalOptions.map((option) => (
                <SelectPrimitive.Item
                  key={option.internalValue}
                  value={option.internalValue}
                  disabled={option.disabled}
                  textValue={option.label}
                  className="surtario-select-item"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="surtario-select-indicator">
                    <Check size={16} strokeWidth={2.5} aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="surtario-select-scroll-button">
              <ChevronDown size={16} aria-hidden />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {name && (
        <input
          className="surtario-select-form-input"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          disabled={disabled}
          value={currentValue}
          required={required}
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

export default Select;
