import axios from "axios"
import { LeafletMouseEvent } from "leaflet"
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { MapContainer, Marker, TileLayer, useMapEvent } from "react-leaflet"
import { Link, useHistory } from "react-router-dom"
import logo from "../../assets/logo.svg"
import Dropzone from "../../components/Dropzone"
import api from "../../services/api"
import "./styles.css"

interface Item {
  id: number
  title: string
  image_url: string
}

interface IBGEUFResponse {
  sigla: string
}

interface IBGECityResponse {
  nome: string
}

interface EventMapComponentProps {
  onClickMap: (event: LeafletMouseEvent) => void
}

const EventMapComponent = ({onClickMap}: EventMapComponentProps) => {
  useMapEvent('click', onClickMap)
  return (<></>)
}

const CreatePoint = () => {
  const history = useHistory()

  const [selectedFile, setSelectedFile] = useState<File>()
  const [items, setItems] = useState<Item[]>([])
  const [ufs, setUfs] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [selectedUf, setSelectedUf] = useState("0")
  const [selectedCity, setSelectedCity] = useState("0")
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([0,0])
  const [initialPosition, setInitialPosition] = useState<[number, number]>([-23.410376199999998, -51.915247699999995])
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
  })

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords
      setInitialPosition([latitude, longitude])
    })
  }, [])
   
  useEffect(() => {
    api.get("/items").then((response) => {
      setItems(response.data)
    })
  }, [])
  
  useEffect(() => {
    axios
      .get<IBGEUFResponse[]>(
        "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
      )
      .then((response) => {
        const ufInitials = response.data.map((uf) => uf.sigla)
        setUfs(ufInitials)
      })
  }, [])

  useEffect(() => {
    if (selectedUf === "0") return

    axios
      .get<IBGECityResponse[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`
      )
      .then((response) => {
        const cityNames = response.data.map((city) => city.nome)
        setCities(cityNames)
      })
  }, [selectedUf])

  function handleSelectUf(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedUf(event.target.value)
  }

  function handleSelectCity(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCity(event.target.value)
  }

  function handleMapClick(event: LeafletMouseEvent) {
    const { lat: latitude, lng: longitude } = event.latlng
    setSelectedPosition([latitude, longitude])
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setFormData({ ...formData, [name]: value })
  }

  function handleSelectItem(id: number) {
    const alreadySelected = selectedItems.includes(id)
    if (alreadySelected) {
      setSelectedItems([
        ...selectedItems.filter((idFiltered) => idFiltered !== id),
      ])
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const { name, email, whatsapp } = formData
    const uf = selectedUf
    const city = selectedCity
    const [latitude, longitude] = selectedPosition
    const items = selectedItems

    const data = new FormData()

    data.append("name", name)
    data.append("email", email)
    data.append("whatsapp", whatsapp)
    data.append("city", city)
    data.append("uf", uf)
    data.append("latitude", String(latitude))
    data.append("longitude", String(longitude))
    data.append("items", items.join(","))

    if (selectedFile) {
      data.append("image", selectedFile)
    }

    // Before we was using this way to send data to the API. This way send a json. But for send
    // files we need to use the "multipart/form-data"
    // const data = {
    //   name,
    //   email,
    //   whatsapp,
    //   city,
    //   uf,
    //   latitude,
    //   longitude,
    //   items,
    // }

    // console.log(data)

    await api.post("/points", data)
    alert('Ponto de coleta cadastrado com sucesso!')

    history.push("/")
  }

  return (
    <div id="page-create-point">
      <header>
        <img src={logo} alt="Ecoleta" />
        <Link to="/">
          <FiArrowLeft />
          Voltar para home
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <h1>
          Cadastro do <br /> ponto de coleta
        </h1>

        <Dropzone onFileUploaded={setSelectedFile} />

        <fieldset>
          <legend>
            <h2>Dados</h2>
          </legend>

          <div className="field">
            <label htmlFor="name">Nome da entidade</label>
            <input
              type="text"
              name="name"
              id="name"
              onChange={handleInputChange}
            />
          </div>

          <div className="field-group">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                onChange={handleInputChange}
              />
            </div>

            <div className="field">
              <label htmlFor="whatsapp">Whatsapp</label>
              <input
                type="text"
                name="whatsapp"
                id="whatsapp"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <h2>Endereço</h2>
            <span>Selecione o endereço no mapa</span>
          </legend>

          <MapContainer center={initialPosition} zoom={15}>
            <TileLayer
              attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={selectedPosition} />
            <EventMapComponent onClickMap={handleMapClick} />
          </MapContainer>

          <div className="field-group">
            <div className="field">
              <label htmlFor="uf">Estado (UF)</label>
              <select
                name="uf"
                id="uf"
                value={selectedUf}
                onChange={handleSelectUf}
              >
                <option value="0">Selecione um estado</option>

                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="city">Cidade</label>
              <select
                name="city"
                id="city"
                value={selectedCity}
                onChange={handleSelectCity}
                disabled={selectedUf === "0"}
              >
                <option value="0">Selecione uma cidade</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <h2>Itens de Coleta</h2>
            <span>Selecione um ou mais itens abaixo</span>
          </legend>

          <ul className="items-grid">
            {items.map((item: Item) => (
              <li
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                className={selectedItems.includes(item.id) ? "selected" : ""}
              >
                <img src={item.image_url} alt={item.title} />
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <button type="submit">Cadastrar ponto de coleta</button>
      </form>
    </div>
  )
}

export default CreatePoint