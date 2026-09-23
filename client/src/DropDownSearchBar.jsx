import { useState, useRef, useEffect, useLayoutEffect, useId } from "react"
import { createPortal } from "react-dom"
import { spacing, colors, radius } from "@mtg/shared"
import { css } from "@emotion/react"
import Button from "@mtg/shared/src/Button"

// Visible to screen readers only
const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const popupCss = css`
  position: fixed;
  background-color: ${colors.white};
  color: ${colors.textPrimary};
  border-radius: ${radius.sm};
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1100;
`

const listCss = css`
  position: relative; /* lets us measure option offsets for scrolling */
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;

  li {
    padding: ${spacing.sm} ${spacing.md};
    cursor: pointer;
  }
  /* Highlight uses a fill AND an edge marker so it isn't color-only */
  li:hover,
  li[aria-selected="true"] {
    background-color: ${colors.lightGrey};
  }
  li[aria-selected="true"] {
    box-shadow: inset 3px 0 0 ${colors.accentActive};
  }
`

const messageCss = css`
  padding: ${spacing.sm} ${spacing.md};
  color: ${colors.textMuted};
`

/**
 * Props
 * - onSearch(value):  async, returns an array of items ({ id, name, ... })
 * - onItemSelect(item)
 * - onSubmit:         optional; shows a Search button and handles Enter with no option highlighted
 * - SearchItemComponent: renders the CONTENT of one option. It receives { data, active }.
 *                     It should NOT render its own <li> or handle clicks; this component does both.
 * - label:            accessible name for the input (visually hidden unless hideLabel={false})
 */
export default function DropDownSearchBar({
  onSearch,
  onSubmit,
  onItemSelect,
  SearchItemComponent,
  label = "Search",
  hideLabel = true,
  placeholder,
}) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false) // a search has complce for the current text
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [placement, setPlacement] = useState(null)

  const debounceTimeout = useRef(null)
  const requestIdRef = useRef(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const id = useId()
  const inputId = `${id}-input`
  const listboxId = `${id}-listbox`
  const optionId = (i) => `${id}-option-${i}`

  const hasResults = results.length > 0
  const expanded = open && hasResults
  const hasText = search.trim().length > 0

  const runSearch = async (value) => {
    if (!value.trim()) {
      requestIdRef.current++
      setResults([])
      setSearching(false)
      setSearched(false)
      return
    }

    const thisRequestId = ++requestIdRef.current

    try {
      const data = await onSearch?.(value)
      if (thisRequestId !== requestIdRef.current) return

      setResults(data ?? [])
      setActiveIndex(-1)
      setSearched(true)
      setError(false)
      // Don't pop the list open if the user has tabbed away while this was loading
      if (document.activeElement === inputRef.current) setOpen(true)
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return
      console.error("Search failed:", err)
      setResults([])
      setError(true)
    }
    setSearching(false)
  }

  const handleChange = (e) => {
    const value = e.target.value
    setSearch(value)
    setSearched(false)
    setError(false)
    setOpen(true)
    setSearching(value.trim().length > 0)

    clearTimeout(debounceTimeout.current)
    debounceTimeout.current = setTimeout(() => runSearch(value), 500)
  }

  const closeList = () => {
    setOpen(false)
    setActiveIndex(-1)
  }

  const selectItem = (item) => {
    // Cancel anything in flight so it can't reopen the list after selecting
    clearTimeout(debounceTimeout.current)
    requestIdRef.current++
    setSearching(false)
    setResults([])
    setSearched(false)
    closeList()
    setSearch(item.name)
    onItemSelect?.(item)
  }

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        if (!hasResults) return
        e.preventDefault()
        setOpen(true)
        setActiveIndex((i) => (expanded ? (i + 1) % results.length : 0))
        break
      case "ArrowUp":
        if (!hasResults) return
        e.preventDefault()
        setOpen(true)
        setActiveIndex((i) => (expanded ? (i <= 0 ? results.length - 1 : i - 1) : results.length - 1))
        break
      case "Enter":
        // With an option highlighted, Enter selects it. Otherwise the form submits normally.
        if (expanded && activeIndex >= 0) {
          e.preventDefault()
          selectItem(results[activeIndex])
        }
        break
      case "Escape":
        // Only swallow Escape if there's a popup to close, so a parent modal can still close on it
        if (open && (hasResults || searching || searched || error)) {
          e.preventDefault()
          e.stopPropagation()
          closeList()
        }
        break
    }
  }

  // Close when focus leaves the whole component (not when it moves between its own parts)
  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) closeList()
  }

  const handleFocus = () => {
    if (!hasText) return
    setOpen(true)
    if (!hasResults && !searching) runSearch(search)
  }

  // Text for the screen reader live region
  let status = ""
  if (error) status = "Search failed. Try again."
  else if (searching) status = "Searching"
  else if (open && hasText && hasResults)
    status = `${results.length} result${results.length === 1 ? "" : "s"} available. Use up and down arrows to review.`
  else if (open && hasText && searched) status = "No results"

  const message =
    error ? "Search failed" : searching ? "Loading..." : searched ? "No results" : null

  // Scroll ONLY the listbox to keep the highlighted option visible.
  // scrollIntoView() also scrolls every ancestor (including overflow:hidden ones
  // like the modal), which is what shoved the modal's content off screen.
  useEffect(() => {
    const list = listRef.current
    const option = activeIndex >= 0 ? document.getElementById(optionId(activeIndex)) : null
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop
    } else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
    }
  }, [activeIndex])

  const showPopup = open && (expanded || (hasText && Boolean(message)))

  // Position the portaled popup under (or above, if there's no room) the input,
  // and keep it attached when anything scrolls or the window resizes.
  useLayoutEffect(() => {
    if (!showPopup) return
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return
      const gap = 4
      const margin = 8
      const spaceBelow = window.innerHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const above = spaceBelow < 160 && spaceAbove > spaceBelow
      setPlacement({
        left: rect.left,
        width: rect.width,
        above,
        top: rect.bottom + gap,
        bottom: window.innerHeight - rect.top + gap,
        maxHeight: Math.max(80, Math.min(240, (above ? spaceAbove : spaceBelow) - gap)),
      })
    }
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true) // capture: catches scrolling in any ancestor
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [showPopup])

  useEffect(() => {
    return () => clearTimeout(debounceTimeout.current)
  }, [])

  const Wrapper = onSubmit ? "form" : "div"

  return (
    <Wrapper
      css={css`
        position: relative;
        width: 300px;
      `}
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        closeList()
        onSubmit?.(search, results)
      }}
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      <label htmlFor={inputId} css={hideLabel ? srOnly : css`display: block; margin-bottom: ${spacing.xs};`}>
        {label}
      </label>

      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${spacing.sm};
        `}
      >
        <div
          css={css`
            position: relative;
            flex: 1;
          `}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={expanded ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={search}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            css={css`
              width: 100%;
              box-sizing: border-box;
              font-size: 14px;
              padding: ${spacing.xs} ${spacing.sm};
            `}
          />

        </div>

        {onSubmit && <Button type="submit" size="sm">Search</Button>}
      </div>

      {showPopup &&
        placement &&
        createPortal(
          // onMouseDown keeps focus in the input when the popup is clicked
          <div
            css={popupCss}
            style={{
              left: placement.left,
              width: placement.width,
              ...(placement.above ? { bottom: placement.bottom } : { top: placement.top }),
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {expanded ? (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={label}
                css={listCss}
                style={{ maxHeight: placement.maxHeight }}
              >
                {results.map((item, i) => (
                  <li
                    key={item.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => selectItem(item)}
                  >
                    {SearchItemComponent ? (
                      <SearchItemComponent data={item} active={i === activeIndex} />
                    ) : (
                      item.name
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              // The live region below announces this, so hide it from the reading order
              <div css={messageCss} aria-hidden="true">
                {message}
              </div>
            )}
          </div>,
          document.body
        )}

      {/* Always rendered so screen readers register it before it changes */}
      <div role="status" aria-live="polite" css={srOnly}>
        {status}
      </div>
    </Wrapper>
  )
}
