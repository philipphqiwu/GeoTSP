import React, { useRef } from 'react'
import { parseTspFile, type TspResult } from '../lib/tspLoader'

type Props = {
  onParse: (result: TspResult) => void
}

export default function TspLoader({ onParse }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const openFile = () => inputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseTspFile(text)
    if (parsed) {
      onParse(parsed)
    } else {
      // lightweight feedback; keep UX simple
      window.alert('Unable to parse .tsp file or file contains fewer than 2 coordinates')
    }
    e.currentTarget.value = ''
  }

  return (
    <div className="tsp-loader">
      <button type="button" onClick={openFile}>
        Load .tsp
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".tsp,text/plain"
        style={{ display: 'none' }}
        onChange={onFile}
      />
    </div>
  )
}
