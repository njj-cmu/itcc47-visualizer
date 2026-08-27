import React, { memo, useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 4;

export const NetworkOperationCarousel = memo(function NetworkOperationCarousel({ timeline, label }) {
  const activeIndex = Math.max(0, timeline.findIndex((item) => item.status === 'active'));
  const activePage = Math.floor(activeIndex / PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(timeline.length / PAGE_SIZE));
  const [page, setPage] = useState(activePage);

  useEffect(() => { setPage(activePage); }, [activePage]);

  const visibleItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return timeline.slice(start, start + PAGE_SIZE);
  }, [page, timeline]);
  const firstVisible = page * PAGE_SIZE + 1;
  const lastVisible = Math.min(timeline.length, firstVisible + PAGE_SIZE - 1);

  return <div className="network-operation-carousel" aria-label={label} data-carousel-page={page + 1} data-operation-total={timeline.length}>
    <button type="button" className="network-carousel-button is-previous" aria-label="Show previous four steps" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>‹</button>
    <div className="network-operation-timeline">
      {visibleItems.map((item) => <span className={`network-operation-item is-${item.status}`} aria-current={item.status === 'active' ? 'step' : undefined} data-operation-index={item.index} key={item.id}>
        <b>{item.index}</b><i>{item.label}</i>
      </span>)}
    </div>
    <button type="button" className="network-carousel-button is-next" aria-label="Show next four steps" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>›</button>
    <span className="network-carousel-range" aria-live="polite">Steps {firstVisible}–{lastVisible} of {timeline.length}</span>
  </div>;
});
