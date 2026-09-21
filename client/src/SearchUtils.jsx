import { css } from '@emotion/react'
import { colors, spacing } from '@mtg/shared'

export function SearchItemsComponent({ data, onClick }) {
  return (
    <p
      css={css`
        color: black;
        font-size: 0.8rem;
      `}
      onClick={onClick}
    >
      {data.name}
    </p>
  )
}

export async function SearchScryfallCommander(query) {
  const default_queries = ["is:commander", "legal:commander"]

  if (!query) return []

  const fullQuery = [...default_queries, query].join(" ")
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(fullQuery)}`

  const data = await fetch(url).then((res) => res.json())

  console.log(data)

  return data.data

}
