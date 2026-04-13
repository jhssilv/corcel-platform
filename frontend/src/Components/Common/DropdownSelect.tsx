import Select, {
	type InputActionMeta,
	type MultiValue,
	type PropsValue,
	type SingleValue,
} from "react-select";
import "./dropdown_select.css";

export interface SelectOption<TValue = string | number | boolean> {
	value: TValue;
	label: string;
}

export type DropdownValue<TValue = string | number | boolean> =
	| SelectOption<TValue>
	| SelectOption<TValue>[]
	| null;

interface DropdownSelectProps<TValue = string | number | boolean> {
	title?: string;
	options?: SelectOption<TValue>[];
	selectedValues?: DropdownValue<TValue>;
	onChange?: (selectedOptions: DropdownValue<TValue>) => void;
	isMulti?: boolean;
	filterOption?:
		| ((option: { label: string; value: string }, rawInput: string) => boolean)
		| null;
	inputValue?: string;
	onInputChange?: (newValue: string, actionMeta: InputActionMeta) => void;
	controlShouldRenderValue?: boolean;
	blurInputOnSelect?: boolean;
}

const DropdownSelect = <
	TValue extends string | number | boolean = string | number | boolean,
>({
	title,
	options = [],
	onChange,
	selectedValues,
	isMulti = false,
	filterOption = null,
	inputValue,
	onInputChange,
	...props
}: DropdownSelectProps<TValue>) => {
	const handleChange = (
		selectedOptions:
			| MultiValue<SelectOption<TValue>>
			| SingleValue<SelectOption<TValue>>,
	) => {
		if (!onChange) {
			return;
		}

		if (Array.isArray(selectedOptions)) {
			onChange(selectedOptions as SelectOption<TValue>[]);
			return;
		}

		onChange((selectedOptions as SelectOption<TValue> | null) ?? null);
	};

	const selectValue = (selectedValues ?? (isMulti ? [] : null)) as PropsValue<
		SelectOption<TValue>
	>;

	return (
		<Select
			classNamePrefix="react-select"
			value={selectValue}
			onChange={handleChange}
			options={options}
			placeholder={title}
			isMulti={isMulti}
			closeMenuOnSelect={!isMulti}
			filterOption={filterOption}
			inputValue={inputValue}
			onInputChange={(newValue, actionMeta) => {
				onInputChange?.(newValue, actionMeta);
				return newValue;
			}}
			{...props}
		/>
	);
};

export default DropdownSelect;
