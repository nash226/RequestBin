import React from 'react'

const MyBaskets = (props:any) => {
  return (
    <div>
      <h2>My Baskets</h2>
      <p className="subtle-text">Choose a bin to load its request history.</p>
      {props.baskets.map((basket: any) => {
        return (
          <p key={String(basket)} className="basket-list-row">
            <button className="basket-link" type="button" onClick={() => props.onBasketClick(basket)}>
              {basket}
            </button>
          </p>
        )
      })}
    </div>
  )
}

export default MyBaskets
