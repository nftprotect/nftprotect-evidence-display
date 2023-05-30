import React from 'react'
import { Helmet } from 'react-helmet'
import RequestLink from '../iframe'
import './styles.css'

const App = () => (
  <>
    <Helmet>
      <title>NFTProtect Display</title>
    </Helmet>
    <RequestLink />
  </>
)

export default App
