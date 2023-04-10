import React from 'react'
import { Helmet } from 'react-helmet'
import YubiaiLink from '../iframe'
import './styles.css'

const App = () => (
  <>
    <Helmet>
      <title>Yubiai Display</title>
    </Helmet>
    <YubiaiLink />
  </>
)

export default App
