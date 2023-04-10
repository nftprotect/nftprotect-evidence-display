import React, { useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import _yubiai from './assets/abis/Yubiai.json'
import useProvider from './bootstrap/dapp-api'
import { Card, Result } from 'antd'

const YubiaiLink = () => {
  const [parameters, setParameters] = useState()
  const [errored, setErrored] = useState()
  const [dealID, setDealID] = useState()
  const {
    provider: fallbackProvider,
    error: fallbackProviderError
  } = useProvider()

  // Read query parameters.
  useEffect(() => {
    if (window.location.search[0] !== '?' || parameters) return
    const message = JSON.parse(
      window.location.search
        .substring(1)
        .replace(/%22/g, '"')
        .replace(/%7B/g, '{')
        .replace(/%3A/g, ':')
        .replace(/%2C/g, ',')
        .replace(/%7D/g, '}')
        .replace(/%2F/g, '/')
    )

    const {
      disputeID,
      arbitrableContractAddress,
      arbitratorContractAddress,
      arbitrableChainID,
      arbitrableJsonRpcUrl
    } = message

    if (!arbitrableContractAddress || !disputeID || !arbitratorContractAddress)
      return

    setParameters({
      arbitrableContractAddress,
      arbitratorContractAddress,
      disputeID,
      arbitrableChainID,
      arbitrableJsonRpcUrl
    })
  }, [parameters])

  const arbitrableSigner = useMemo(() => {
    if (!parameters) return

    const { arbitrableJsonRpcUrl } = parameters
    if (!arbitrableJsonRpcUrl && !fallbackProvider) return

    let provider = fallbackProvider
    if (arbitrableJsonRpcUrl)
      provider = new ethers.providers.JsonRpcProvider(arbitrableJsonRpcUrl)

    // Using a random signer because provider does not have getChainId for
    // whatever reason.
    return new ethers.Wallet('0x123123123123123123123132123123', provider)
  }, [fallbackProvider, parameters])

  const yubiaiContract = useMemo(() => {
    if (!parameters) return
    if (!arbitrableSigner) return
    let { arbitrableContractAddress } = parameters
    if (!arbitrableContractAddress)
      arbitrableContractAddress = '0xAeECFa44639b61d2e0A9534D918789d94A24a9DE' // hardcode yubiai address

    try {
      return new ethers.Contract(
        arbitrableContractAddress,
        _yubiai,
        arbitrableSigner
      )
    } catch (err) {
      console.error(`Error instantiating yubiai contract`, err)
      setErrored({
        title: 'Error loading item. Are you in the correct network?',
        subTitle: err.message
      })
      return null
    }
  }, [arbitrableSigner, parameters])

  // Fetch clain and derive deal id.
  useEffect(() => {
    if (!yubiaiContract || dealID !== undefined || !parameters) return
    const { disputeID, arbitrableChainID } = parameters
    ;(async () => {
      try {
        const chainID = await arbitrableSigner.getChainId()
        if (chainID !== Number(arbitrableChainID))
          throw new Error(
            `Mismatch on chain Id. Injected: ${arbitrableChainID}, provider ${chainID}`
          )
      } catch (err) {
        console.error(`Error fetching deal`, err)
        setErrored({
          title: `Invalid. Mismatch between injected and provider chainID`,
          subTitle: err.message
        })
      }
      try {
        const claimID = await yubiaiContract.disputeIdToClaim(disputeID)
        const claim = await yubiaiContract.claims(claimID)
        console.log({ claim, claimID, disputeID })
        setDealID(claim.dealId)
      } catch (err) {
        console.error('Error fetching Deal', err)
        setErrored({
          title: 'Error fetching Yubiai Deal. Are you in the correct network?',
          subTitle: err.message
        })
      }
    })()
  }, [arbitrableSigner, yubiaiContract, dealID, parameters])

  if (errored)
    return (
      <Card bordered>
        <Result
          status="warning"
          title={errored.title}
          subTitle={errored.subTitle}
        />
      </Card>
    )

  if (fallbackProviderError && !yubiaiContract)
    return (
      <Card bordered>
        <Result status="warning" title={fallbackProviderError} />
      </Card>
    )

  if (!dealID || !parameters) return <Card loading bordered />

  return (
    <Card bordered>
      {process.env.REACT_APP_YUBIAI_URL && (
        <a
          href={`${process.env.REACT_APP_YUBIAI_URL}/deal/${dealID}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          See Yubiai Post
        </a>
      )}
    </Card>
  )
}
export default YubiaiLink
