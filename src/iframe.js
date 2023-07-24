import React, { useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import NFTProtectABI from './assets/abis/NFTProtectABI.json'
import ArbitrableProxyABI from './assets/abis/ArbitrableProxyABI.json'
import useProvider from './bootstrap/dapp-api'
import { Card, Result } from 'antd'
import { NFTProtectUrl, supportedChains } from './config'

const RequestLink = () => {
  const [parameters, setParameters] = useState()
  const [errored, setErrored] = useState()
  const [requestId, setRequestId] = useState()
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

  const NftProtectContract = useMemo(() => {
    if (!parameters) return
    if (!arbitrableSigner) return
    const address = supportedChains.find(chain => chain.id.toString() === parameters.arbitrableChainID)?.nftpContractAddress
    if (!address) {
      console.error(`nftprotect contract not found for chainId ${parameters.arbitrableChainID}`)
      setErrored({
        title: 'Error loading item. Are you in the correct network?',
        subTitle: `nftprotect contract not found for chainId ${parameters.arbitrableChainID}`
      })
      return null
    }

    try {
      return new ethers.Contract(
        address,
        NFTProtectABI,
        arbitrableSigner
      )
    } catch (err) {
      console.error(`Error instantiating nftprotect contract`, err)
      setErrored({
        title: 'Error loading item. Are you in the correct network?',
        subTitle: err.message
      })
      return null
    }
  }, [arbitrableSigner, parameters])

  const ArbitrableProxyContract = useMemo(() => {
    if (!parameters) return
    if (!arbitrableSigner) return
    let { arbitrableContractAddress } = parameters
    if (!arbitrableContractAddress) {
      console.error(`No arbitrable contract address provided`)
      setErrored({
        title: 'Error loading item. Are you in the correct network?',
        subTitle: 'No arbitrable contract address provided'
      })
      return null
    }

    try {
      return new ethers.Contract(
        arbitrableContractAddress,
        ArbitrableProxyABI,
        arbitrableSigner
      )
    } catch (err) {
      console.error(`Error instantiating arbitrable proxy contract`, err)
      setErrored({
        title: 'Error loading item. Are you in the correct network?',
        subTitle: err.message
      })
      return null
    }
  }, [arbitrableSigner, parameters])

  // Fetch clain and derive deal id.
  useEffect(() => {
    if (!NftProtectContract || !ArbitrableProxyContract || requestId !== undefined || !parameters) return
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
        const localDisputeId = await ArbitrableProxyContract.externalIDtoLocalID(disputeID)
        const requestId = await NftProtectContract.disputeToRequest(localDisputeId)
        console.log('Loaded data:', { disputeID, localDisputeId, requestId })
        setRequestId(requestId)
      } catch (err) {
        console.error('Error fetching Deal', err)
        setErrored({
          title: 'Error fetching NFTProtect request. Are you in the correct network?',
          subTitle: err.message
        })
      }
    })()
  }, [arbitrableSigner, NftProtectContract, requestId, parameters])

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

  if (fallbackProviderError && !NftProtectContract)
    return (
      <Card bordered>
        <Result status="warning" title={fallbackProviderError} />
      </Card>
    )

  if (!requestId || !parameters) return <Card loading bordered />

  return (
    <Card bordered>
      {NFTProtectUrl && (
        <a
          href={`${NFTProtectUrl}/request/${parameters?.arbitrableChainID}/${requestId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open NFTProtect request page
        </a>
      )}
    </Card>
  )
}
export default RequestLink
