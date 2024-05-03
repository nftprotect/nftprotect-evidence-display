import React, { useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import NFTProtectABI from './assets/abis/NFTProtectABI.json'
import ArbitrableProxyABI from './assets/abis/ArbitrableProxyABI.json'
import useProvider from './bootstrap/dapp-api'
import { Card, Result } from 'antd'
import { NFTProtectUrl, supportedChains } from './config'

const getUrl = (requestId, chainId) => `${NFTProtectUrl}/request/${chainId}/${requestId}`

const getContent = (requestId, chainId, metaEvidenceType) => {
  const contents = [
    <></>, // used in burn() - ultra
    <></>, // used in adjustOwnership() - ultra
    <></>, // used in answerOwnershipAdjustment() - ultra
    <div>
      <p>A dispute concerning a pNFT (protected copy of the original NFT) has arisen!</p>
      <p><b>The Claimant</b> alleges they acquired the pNFT through a bona fide transaction. However, the Original Owner refuses to hand over the original NFT to them.</p>
      <p>NFT Protect offers the detailed <b><a href={getUrl(requestId, chainId)} target='_blank' rel="noopener">evidence page</a></b>.</p>
      <p><b>The Defendant</b> is identified as the Original Owner of the NFT.</p>
      <p>The Jury Duty is to examine the evidence page and, based on the Policy, determine whether the pNFT transfer was genuinely bona fide. If proven so, the pNFT will be burned, and the original NFT will be handed over to the Claimant (New Owner). If not, the pNFT remains with the Claimant, but the Defendant (Original Owner) can initiate a new case.</p>
    </div>, // used in askOwnershipAdjustmentArbitrate() - basic
    <div>
      <p>A dispute concerning a pNFT (protected copy of the original NFT) has arisen!</p>
      <p><b>The Claimant</b> alleges they mistakenly sent their pNFT to an incorrect address.</p>
      <p>NFT Protect offers the detailed <b><a href={getUrl(requestId, chainId)} target='_blank' rel="noopener">evidence page</a></b>.</p>
      <p><b>The Defendant</b> is identified as the party that either rightfully or wrongfully received the pNFT.</p>
      <p>The Jury Duty is to examine the evidence page and, based on the Policy, determine if the pNFT was wrongly sent, resulting in an ownership change. If this is proven true, the pNFT will be burned, and the original will return to the Original Owner. If not, the pNFT will remain with the Defendant.</p>
    </div>, // used in askOwnershipRestoreArbitrate() for sending to incorrect address- basic
    <div>
      <p>A dispute concerning a pNFT (protected copy of the original NFT) has arisen!</p>
      <p><b>The Claimant</b> alleges they lost their pNFT to a phishing attack.</p>
      <p>NFT Protect offers the detailed <b><a href={getUrl(requestId, chainId)} target='_blank' rel="noopener">evidence page</a></b>.</p>
      <p><b>The Defendant</b> is identified as the party that either lawfully or unlawfully acquired the pNFT.</p>
      <p>The Jury Duty is to examine the evidence page and, based on the Policy, determine if a phishing attack led to the change in pNFT ownership. If the attack is verified, the pNFT will be burned, and the original will return to the Original Owner. If not, the pNFT will remain with the Defendant.</p>
    </div>, // used in askOwnershipRestoreArbitrate() for phishing atack - basic
    <div>
      <p>A dispute concerning a pNFT (protected copy of the original NFT) has arisen!</p>
      <p><b>The Claimant</b> alleges they lost their pNFT to a protocol breach.</p>
      <p>NFT Protect offers the detailed <b><a href={getUrl(requestId, chainId)} target='_blank' rel="noopener">evidence page</a></b>.</p>
      <p><b>The Respondent</b> is identified as the protocol itself, which might be responsible for the alleged breach.</p>
      <p>The Jury Duty is to examine the evidence page and, based on the Policy, determine if a protocol breach occurred. If this breach is verified, the pNFT will be burned, and the original will return to the Original Owner. Otherwise, the pNFT will remain with the Respondent.</p>
    </div>,  // used in askOwnershipRestoreArbitrate() for protocol breach - basic
  ]
  return contents[metaEvidenceType]
}

const RequestLink = () => {
  const [parameters, setParameters] = useState()
  const [errored, setErrored] = useState()
  const [requestId, setRequestId] = useState()
  const [metaEvidenceType, setMetaEvidenceType] = useState()
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

    // const { arbitrableJsonRpcUrl } = parameters
    // if (!arbitrableJsonRpcUrl && !fallbackProvider) return

    // let provider = fallbackProvider
    // if (arbitrableJsonRpcUrl) {
    //   if (arbitrableJsonRpcUrl.toLowerCase().startsWith('wss:')) {
    //     provider = new ethers.providers.WebSocketProvider(arbitrableJsonRpcUrl)
    //   } else {
    //     provider = new ethers.providers.JsonRpcProvider(arbitrableJsonRpcUrl)
    //   }
    // }
    const rpcUrl = supportedChains.find(chain => chain.id.toString() === parameters.arbitrableChainID.toString())?.nodeUrl
    const provider = rpcUrl ? new ethers.providers.JsonRpcProvider(rpcUrl) : fallbackProvider
    // Using a random signer because provider does not have getChainId for
    // whatever reason.
    return new ethers.Wallet('0x123123123123123123123132123123', provider)
  }, [fallbackProvider, parameters])

  const NftProtectContract = useMemo(() => {
    if (!parameters) return
    if (!arbitrableSigner) return
    const address = supportedChains.find(chain => chain.id.toString() === parameters.arbitrableChainID.toString())?.nftpContractAddress
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
        const disputeKeyHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [1, localDisputeId]);
        const requestId = await NftProtectContract.disputeToRequest(disputeKeyHash)
        setRequestId(requestId)
        let requestData
        try {
          requestData = await NftProtectContract.requests(requestId)
          setMetaEvidenceType(requestData.metaevidence)
        } catch (err) {
          console.error('Error loading request data', err)
        }
        console.log('Loaded data:', { disputeID, localDisputeId, requestId, requestData })
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
      <Card>
        <Result
          status="warning"
          title={errored.title}
          subTitle={errored.subTitle}
        />
      </Card>
    )

  if (fallbackProviderError && !NftProtectContract)
    return (
      <Card>
        <Result status="warning" title={fallbackProviderError} />
      </Card>
    )

  if (!requestId || (metaEvidenceType === undefined) || !parameters) return <Card bordered={false} loading />

  return (
    <Card bordered={false} style={{boxShadow: 'none'}} bodyStyle={{ padding: 0 }}>
      { getContent(requestId, parameters.arbitrableChainID, metaEvidenceType) }
      <img src='header.svg' width='100%' title='NFT Protect' alt='NFT Protect'/>
    </Card>
  )
}
export default RequestLink
