import React from 'react'
import basketService from '../services/basketService'

const MyBaskets = (props:any) => {

  async function handleDeleteBasket(basket: string) {
    const endpoint = basket.split('/')[3]
    basketService.deleteBasket(endpoint)
      .then(() => { props.onBasketDelete(basket)})
      .catch(error => {console.error(error)})
  }
  
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
              <button className="basket-delete-button" onClick={() => handleDeleteBasket(basket)}>Delete</button>
          </p>  
        )
      })}
    </div>
  )
}

export default MyBaskets
