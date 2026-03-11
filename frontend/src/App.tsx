import { useState, useEffect } from 'react'
import './App.css';
import NewBasket from './components/NewBasket'
import MyBaskets from './components/MyBaskets'
import RequestsForBasket from './components/RequestsForBasket'
import basketService from './services/basketService'

function App() {

  const backendBaseUrl = 'http://localhost:3000'
  const dummyBasketData = `${backendBaseUrl}/asjdfj`
  
  const [userToken, setUserToken] = useState<string | null>(null)
  const [baskets, setUserBaskets] = useState([dummyBasketData]) //TODO rewire when Backend team adds endpoints
  const [selectedBasket, setSelectedBasket] = useState<string | null>(null)
  const [newBasketEndpoint, setNewBasketEndpoint] = useState<string>('')

  async function handleBasketClick(basket: any) {
    const basketId = String(basket)
    console.log(basket)
    setSelectedBasket(basketId)
  }

  async function handleBasketDeleted(basket: any) {
    setUserBaskets((prev) => prev.filter((b) => b !== basket))
  }

  function handleBasketCreated(data: any) {
    if (!data) return;

    if (data.masterToken) {
      localStorage.setItem('userToken', data.masterToken);
      setUserToken(data.masterToken);
    }

    if (data.newEndPoint) {
      const createdBasketUrl = `${backendBaseUrl}/${data.newEndPoint}`
      setUserBaskets((prev) => [...prev, createdBasketUrl]);
      basketService.generateEndpoint()
        .then((response) => {
          setNewBasketEndpoint(response.data?.newEndPoint || '')
        })
        .catch((err) => {
          console.error('Error generating next endpoint', err)
        })
    }
  }

  useEffect(() => {
    let token = localStorage.getItem('userToken') || null
    setUserToken(token);

    basketService.generateEndpoint()
      .then((response) => {
        setNewBasketEndpoint(response.data?.newEndPoint || '')
      })
      .catch((err) => {
        console.error('Error generating endpoint', err)
      })

    fetch("/api/web/baskets", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "master-token": token } : {}),
      },
    })
      .then(async (response) => {
        if (response.status === 204) return [];
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((rows: any[]) => {
        if (Array.isArray(rows)) {
          const mapped = rows.map((row: any) => `http://localhost:3000/${row.endpoint}`);
          setUserBaskets(mapped);
        }
      })
      .catch(err => {
        console.error("An error occurred", err);
      });
    }, []);


  return (
    <div className="App">
      <header className="app-hero">
        <p className="eyebrow">Request Bin</p>
        <h1>Inspect HTTP Traffic Instantly</h1>
      </header>
      <div className="component-container">
        <div className="new-basket-panel">
          <NewBasket
            userToken={userToken}
            endpoint={newBasketEndpoint}
            setEndpoint={setNewBasketEndpoint}
            onBasketCreated={handleBasketCreated}
          />
        </div>
        <div className="my-baskets-panel">
          <MyBaskets baskets={baskets} onBasketClick={handleBasketClick} onBasketDelete={handleBasketDeleted}/>
        </div>
      </div>
      {selectedBasket && (
        <RequestsForBasket selectedBasket={selectedBasket} />
      )}
    </div>
  );
}

export default App;
