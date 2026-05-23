import { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import Modal from './Modal';
import { radius, spacing } from '@mtg/shared';

const imageStyle = css`
  width: 150px;
  height: auto;
  display: flex;
  border-radius: ${radius.md};
  cursor: pointer;
`

const divStyle = css`
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
  justify-content: center;
  align-items: center;
  gap: ${spacing.md};
  width: 100%;
`

export default function ImageSelector({ card, onSelect, onClose }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const id = card.scryfall_id;
    if (!id) return;

    async function load() {
      const cardData = await fetch(`https://api.scryfall.com/cards/${id}`).then(r => r.json());
      const prints = await fetch(
        `https://api.scryfall.com/cards/search?q=oracleid:${cardData.oracle_id}&unique=art`
      ).then(r => r.json());
      setImages(prints.data ?? []);
    }

    load();
  }, [card]);

  return (
    <Modal isOpen onClose={onClose}>
      <div
        css={divStyle}
      >
        {images.length > 0 ? images.map(img => (
          <img
            css={imageStyle}
            key={img.id}
            src={img.image_uris?.normal ?? img.card_faces?.[0]?.image_uris?.normal}
            alt={img.name}
            onClick={() => onSelect(img)}
          />
        )) : <p>Loading...</p>}
      </div>
    </Modal>
  );
}
