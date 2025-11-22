import { ComponentProps } from 'react';

const buildClassName = (icon: string, className?: string) =>
  ['fa-solid', icon, className].filter(Boolean).join(' ');

type IconProps = Omit<ComponentProps<'i'>, 'children'>;

const Icon = ({
  icon,
  className,
  'aria-hidden': ariaHidden,
  ...props
}: IconProps & { icon: string }) => (
  <i
    {...props}
    aria-hidden={ariaHidden ?? true}
    className={buildClassName(icon, className)}
    role="img"
  />
);

export const ArrowLeftIcon = (props: IconProps) => <Icon icon="fa-arrow-left" {...props} />;
export const LogoutIcon = (props: IconProps) => <Icon icon="fa-right-from-bracket" {...props} />;
export const UserIcon = (props: IconProps) => <Icon icon="fa-user" {...props} />;
export const ThemeIcon = (props: IconProps) => <Icon icon="fa-sun" {...props} />;
export const StorefrontIcon = (props: IconProps) => <Icon icon="fa-store" {...props} />;
export const UsersGroupIcon = (props: IconProps) => <Icon icon="fa-users" {...props} />;
export const BarChartIcon = (props: IconProps) => <Icon icon="fa-chart-column" {...props} />;
export const SparklesIcon = (props: IconProps) => <Icon icon="fa-wand-magic-sparkles" {...props} />;
export const EyeIcon = (props: IconProps) => <Icon icon="fa-eye" {...props} />;
export const EyeSlashIcon = (props: IconProps) => <Icon icon="fa-eye-slash" {...props} />;
export const ActivityIcon = (props: IconProps) => <Icon icon="fa-chart-line" {...props} />;
export const FilterIcon = (props: IconProps) => <Icon icon="fa-filter" {...props} />;
export const ChevronDownIcon = (props: IconProps) => <Icon icon="fa-chevron-down" {...props} />;
