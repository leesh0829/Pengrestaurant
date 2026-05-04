import type { SVGProps } from 'react'

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon-svg"
      {...props}
    />
  )
}

export function MenuIcon() {
  return (
    <IconBase>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  )
}

export function PanelCloseIcon() {
  return (
    <IconBase>
      <path d="M15 6l-6 6 6 6" />
      <path d="M9 6h8" />
      <path d="M9 18h8" />
    </IconBase>
  )
}

export function ShieldIcon() {
  return (
    <IconBase>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
      <path d="M9.5 12l1.6 1.6L14.8 10" />
    </IconBase>
  )
}

export function ShieldOffIcon() {
  return (
    <IconBase>
      <path d="M4 4l16 16" />
      <path d="M12 3l7 3v5c0 1.9-.5 3.6-1.3 5" />
      <path d="M10.7 19.7C7.4 18 5 14.7 5 11V6l7-3" />
    </IconBase>
  )
}

export function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  )
}

export function EditIcon() {
  return (
    <IconBase>
      <path d="M4 20l4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20z" />
      <path d="M13.5 7.5l3 3" />
    </IconBase>
  )
}

export function TrashIcon() {
  return (
    <IconBase>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4h6v3" />
    </IconBase>
  )
}

export function CloseIcon() {
  return (
    <IconBase>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </IconBase>
  )
}

export function CheckIcon() {
  return (
    <IconBase>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </IconBase>
  )
}

export function SearchIcon() {
  return (
    <IconBase>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </IconBase>
  )
}

export function BackIcon() {
  return (
    <IconBase>
      <path d="M15 5l-6 7 6 7" />
    </IconBase>
  )
}

export function FilterIcon() {
  return (
    <IconBase>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </IconBase>
  )
}

export function GripIcon() {
  return (
    <IconBase>
      <path d="M8 8h.01" />
      <path d="M12 8h.01" />
      <path d="M16 8h.01" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
      <path d="M16 16h.01" />
    </IconBase>
  )
}
