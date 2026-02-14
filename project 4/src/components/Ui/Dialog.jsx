import React, { useEffect } from 'react'

// A simple dialog component with a semi-transparent backdrop
const Dialog = ({
  title,
  children,
  onCancel = () => {},
  onOk = () => {},
  cancelText = 'Cancel',
  okText = 'OK',
  show = true,
}) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onOk()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel, onOk])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
        <div className="mb-4">{children}</div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onOk}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dialog