import { useState, useEffect } from 'react'
import './App.css';
import NewBasket from './components/NewBasket'
import MyBaskets from './components/MyBaskets'
import basketService from './services/basketService'

function App() {

  const backendBaseUrl = 'http://localhost:3000'
  
  const [userToken, setUserToken] = useState<string | null>(null)
  const [baskets, setUserBaskets] = useState<string[]>([])
  const [selectedBasket, setSelectedBasket] = useState<string | null>(null)
  const [selectedBasketRequests, setSelectedBasketRequests] = useState<any[]>([])
  const [selectedRequestIndex, setSelectedRequestIndex] = useState<number>(0)
  const [newBasketEndpoint, setNewBasketEndpoint] = useState<string>('')

  function getEndpointFromBasketValue(basket: string) {
    try {
      const parsed = new URL(basket)
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop()
      return lastSegment || basket
    } catch (err) {
      const lastSegment = basket.split('/').filter(Boolean).pop()
      return lastSegment || basket
    }
  }

  function normalizeRequestRow(row: any, endpoint: string) {
    const datePart = row.request_date ? String(row.request_date).slice(0, 10) : ''
    const timePart = row.request_time ? String(row.request_time).split('.')[0] : ''
    const combinedDate = datePart && timePart ? `${datePart}T${timePart}` : new Date().toISOString()

    return {
      method: row.method || 'UNKNOWN',
      headers: row.headers || {},
      body: row.mongoRequestBody?.requestPayload || row.body || '',
      path: row.path || `/${endpoint}`,
      date: combinedDate,
    }
  }

  async function handleBasketClick(basket: any) {
    const basketId = String(basket)
    const endpoint = getEndpointFromBasketValue(basketId)
    setSelectedBasket(basketId)
    setSelectedRequestIndex(0)

    try {
      const response = await basketService.getRequests(endpoint)
      const rows = Array.isArray(response.data) ? response.data : []
      const normalizedRequests = rows.map((row: any) => normalizeRequestRow(row, endpoint))
      setSelectedBasketRequests(normalizedRequests)
    } catch (err) {
      console.error('Error fetching basket requests', err)
      setSelectedBasketRequests([])
    }
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

    //why are we using a POST request here?? I changed to 'GET'.
    //Also I think we need to pass token via header, we can change when backend team updates.
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
          <MyBaskets baskets={baskets} onBasketClick={handleBasketClick} />
        </div>
      </div>
      {selectedBasket && (
        <div className="requests-panel">
          <h2>Requests for Basket</h2>
          <p className="basket-url">{selectedBasket}</p>
          <p className="request-total">Total Requests: {selectedBasketRequests.length}</p>
          <div className="requests-layout">
            <div className="request-history">
              {selectedBasketRequests.map((request, index) => (
                <button
                  key={index}
                  type="button"
                  className={`request-list-item ${selectedRequestIndex === index ? 'active' : ''}`}
                  onClick={() => setSelectedRequestIndex(index)}
                >
                  <span className="request-method">{request.method}</span>
                  <span className="request-path">{request.path}</span>
                  <span className="request-date">{new Date(request.date).toLocaleString()}</span>
                </button>
              ))}
            </div>

            <div className="request-detail-card">
              {selectedBasketRequests[selectedRequestIndex] && (
                <>
                  <p><strong>Method:</strong> {selectedBasketRequests[selectedRequestIndex].method}</p>
                  <p><strong>Path:</strong> {selectedBasketRequests[selectedRequestIndex].path}</p>
                  <p><strong>Date:</strong> {selectedBasketRequests[selectedRequestIndex].date}</p>
                  <p><strong>Headers:</strong></p>
                  <pre>{JSON.stringify(selectedBasketRequests[selectedRequestIndex].headers, null, 2)}</pre>
                  <p><strong>Body:</strong></p>
                  <pre>
                    {typeof selectedBasketRequests[selectedRequestIndex].body === "string"
                      ? selectedBasketRequests[selectedRequestIndex].body
                      : JSON.stringify(selectedBasketRequests[selectedRequestIndex].body, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
