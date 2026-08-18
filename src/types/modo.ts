export interface ModoHandle {
  confirm: () => void;
  hint: () => void;
  skip?: () => void;
}
