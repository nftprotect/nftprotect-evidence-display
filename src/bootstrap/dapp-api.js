import { ethers } from 'ethers'
import { useEffect, useState } from 'react'

const useProvider = () => {
  const [error, setError] = useState(false)
  const [provider, setProvider] = useState()

  useEffect(() => {
    ;(async () => {
      if (provider) return
      try {
        if (window.web3 && window.web3.currentProvider && window.ethereum) {
          window.ethereum.enable
            ? await window.ethereum.enable()
            : await window.ethereum.sendAsync({
                method: 'eth_requestAccounts',
                params: []
              })
          setProvider(new ethers.providers.Web3Provider(window.ethereum))
        } else if (process.env.REACT_APP_ETHEREUM_PROVIDER)
          setProvider(
            new ethers.providers.JsonRpcProvider(
              process.env.REACT_APP_ETHEREUM_PROVIDER
            )
          )
        else setError('No ethereum provider available.')
      } catch (err) {
        setError('Error setting up provider')
        console.error(err)
      }
    })()
  }, [provider])

  return { provider, error }
}

export default useProvider
