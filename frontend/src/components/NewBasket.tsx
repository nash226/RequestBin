import React from 'react'
import basketService from '../services/basketService'

const NewBasket = () => {

  function handleCreateBasket(event: any) {
    event.preventDefault()
    let url = event.target.previousElementSibling.childNodes[0]
    let inputValue = event.target.previousElementSibling.children[0].value
    let payload = {
      body: "test data"
    }

    if (inputValue){
      basketService.create(payload)
    }
  }

  return (
    <div>
      <h1>New Basket</h1>
      <p>Create a new basket to send HTTP requests to.</p>
      <p className="input-row">http://localhost:3000/<input aria-label="new-basket-path"></input></p>
      <button className="cta-button" onClick={handleCreateBasket}>Create</button>
    </div>
  )
}

export default NewBasket
