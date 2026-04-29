import * as LucideIcons from 'lucide-react';
import { useThemeContext } from '../../../theme/ThemeProvider.js';
import type { LucideProps } from 'lucide-react';

interface TokenIconProps extends LucideProps {
  token: string;
}

export const TokenIcon = ({ token, ...props }: TokenIconProps) => {
  const { theme } = useThemeContext();
  
  // 1. Look up the "Real" icon name from the Theme Variable
  const iconName = theme.assets.icons.tokenMap[token] || 'HelpCircle'; 
  
  // 2. Dynamic resolution
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<LucideProps>;

  if (!IconComponent) return <LucideIcons.AlertTriangle {...props} />;

  return <IconComponent {...props} />;
};
