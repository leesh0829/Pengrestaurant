import { CheckIcon, CloseIcon } from './Icons'

type AdminPasswordModalProps = {
  isOpen: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (password: string) => void
}

export function AdminPasswordModal({
  isOpen,
  errorMessage,
  onClose,
  onSubmit,
}: AdminPasswordModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop admin-password-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Admin mode</p>
            <h2 id="admin-password-title">비밀번호 입력</h2>
          </div>
          <button
            type="button"
            className="ghost-button icon-button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          className="password-form"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            onSubmit(String(formData.get('password') ?? ''))
          }}
        >
          <label className="field">
            <span>어드민 비밀번호</span>
            <input
              autoFocus
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button
            type="submit"
            className="primary-button icon-button"
            aria-label="어드민 모드 진입"
            title="어드민 모드 진입"
          >
            <CheckIcon />
          </button>
        </form>
      </div>
    </div>
  )
}
