import React from 'react'
import basketService from '../services/basketService'

const NewBasket = ({ userToken, endpoint, setEndpoint, onBasketCreated }: any) => {

  async function handleCreateBasket(event: any) {
    event.preventDefault()
    if (!endpoint) return;

    try {
      const response = await basketService.create(endpoint, userToken)
      onBasketCreated?.(response.data)
    } catch (err) {
      console.error('Error creating basket', err)
    }
  }

  return (
    <div>
      <h1>New Basket</h1>
      <p>Create a new basket to send HTTP requests to.</p>
      <p className="input-row">
        http://localhost:3000/
        <input
          aria-label="new-basket-path"
          value={endpoint || ''}
          onChange={(event) => setEndpoint?.(event.target.value)}
        />
      </p>
      <button className="cta-button" onClick={handleCreateBasket}>Create</button>
    </div>
  )
}

export default NewBasket
