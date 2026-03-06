import React from 'react'

const NewBasket = () => {

  function handleBasketCreate(event) {
    event.preventDefault()
    let textBoxValue = event.target.parentNode.children[2].children[0].value
    console.log(`New Basket Created: https://requestbasket.com/${textBoxValue}`)
  }

  return (
    <div className="NewBasket">
      <h1>New Basket</h1>
      <p>Create a basket to send HTTP requests to</p>
      <p>https://requestbasket.com/<input></input></p>
      <button onClick={handleBasketCreate}>Create</button>
    </div>
  )
}

export default NewBasket