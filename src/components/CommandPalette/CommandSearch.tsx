import React from 'react'

interface CommandSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const CommandSearch: React.FC<CommandSearchProps> = ({
  value,
  onChange,
  placeholder = '输入命令或关键词...',
}) => {
  return (
    <div className="command-search">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>
  )
}

export default CommandSearch
