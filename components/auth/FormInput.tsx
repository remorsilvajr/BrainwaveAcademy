import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  id,
  type = "text",
  icon,
  placeholder,
  ...rest
}) => {
  return (
    <div className="w-full space-y-1 text-left">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          {...rest}
          className={`w-full rounded-lg border border-slate-300 hover:border-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 bg-white py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none ${
            icon ? "pl-10" : "pl-3.5"
          } pr-3.5`}
        />
      </div>
    </div>
  );
};
