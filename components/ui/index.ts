/**
 * UI Components exports
 */

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Loading } from './Loading';
export type { LoadingProps } from './Loading';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Switch } from './Switch';
export type { SwitchProps } from './Switch';

export { ToastProvider, useToast } from './Toast';
export type { Toast, ToastType } from './Toast';

export {
  OptimizedImage,
  LogoImage,
  ProductImage,
  CategoryImage,
  BannerImage,
} from './OptimizedImage';
export type { OptimizedImageProps } from './OptimizedImage';

// Export new components
export { StatusBadge, statusUtils } from '../status/StatusBadge';
export type { StatusType } from '../status/StatusBadge';

export { CancellationDialog } from '../dialogs/CancellationDialog';
export { ConfirmDialog, useConfirmDialog } from '../dialogs/ConfirmDialog';
export type { ConfirmDialogType } from '../dialogs/ConfirmDialog';

export { ShareButton } from './ShareButton';
export type { ShareButtonProps } from './ShareButton';

export { ExportButton } from './ExportButton';
export type { ExportButtonProps } from './ExportButton';
