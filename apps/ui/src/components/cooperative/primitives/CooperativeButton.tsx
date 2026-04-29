
export interface CooperativeButtonProps {
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  actionId?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const CooperativeButton = ({ label, variant = "primary", onClick, children }: CooperativeButtonProps) => {
  const baseStyle = "px-4 py-2 rounded font-medium transition-colors";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    secondary: "bg-zinc-700 text-white hover:bg-zinc-600",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]}`} onClick={onClick}>
      {label}
      {children}
    </button>
  );
};
