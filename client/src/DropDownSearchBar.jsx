import { useState, useRef, useEffect } from "react"
import { spacing, colors } from "@mtg/shared"
import { css } from '@emotion/react'

export default function DropDownSearchBar({
  onSearch,
  onSubmit,
  onItemSelect,
  SearchItemComponent
}) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceTimeout = useRef(null)
  const requestIdRef = useRef(0)

  const runSearch = async (value) => {
    const thisRequestId = ++requestIdRef.current

    try {
      const data = await onSearch?.(value)

      if (thisRequestId !== requestIdRef.current) return

      setResults(data)
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return
      console.error("Search failed:", err)
    }
    setSearching(false)
  }


  const handleChange = (e) => {
    setSearching(true)
    const value = e.target.value
    setSearch(value)

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      runSearch(value)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
    }
  }, [])

  return (
    <form
      css={css`
        position: relative;
      `}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      onBlur={() => {
        setResults([])
      }}
      onFocus={() => {
        if (search) {
          runSearch(search)
        }
      }}
    >
      <div
        css={css`
          width: 300px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-right: ${spacing.lg};
        `}
      >
        <input type="text" value={search} onChange={handleChange} />
        {onSubmit &&
          <button type="submit">Search</button>
        }
      </div>

      {(results.length > 0 || searching) &&
        <ul
          css={css`
            width: 250px;
            max-height: 200px;
            overflow-y: auto;
            top: 100%;
            left: ${spacing.md};
            background-color: ${colors.white};
            color: ${colors.black};
            position: absolute;
          `}
          onMouseDown={(e) => e.preventDefault()}
        >
          {searching && results.length === 0 && <p css={css`color:black;`}>loading...</p>}
          {results.length > 0 && results.map(item =>
            <SearchItemComponent
              data={item}
              onClick={() => {
                setResults(([]))
                setSearch(item.name)
                onItemSelect(item)
              }}
              key={item.id}
            />
          )}
        </ul>
      }
    </form>
  )
} 
