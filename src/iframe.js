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
      <h3>Ownership adjustment in case of bona fide transfer</h3>
      <div>
        <p>A dispute over a pNFT (protected copy of the original NFT) has arisen!</p>
        <p><b>The Claimant</b> asserts that they transferred their pNFT to another individual under a bona fide agreement. However, now they have reservations about this transaction.</p>
        <p>NFT Protect has prepared a <a href={getUrl(requestId, chainId)}>case page</a> aiming to provide comprehensive information.</p>
        <p><b>The Defendant</b>  is the party that potentially acquired the pNFT as part of a sale. It is incumbent upon the Defendant to substantiate that the acquisition was made in good faith.</p>
        <p>You are tasked to review the evidence and determine, based on the Policy, if the pNFT transfer was genuinely made in good faith.</p>
        <p>If the transfer is established as bona fide, the pNFT will stay with the Defendant.</p>
        <p>If the transfer is deemed not bona fide, NFT Protect will burn the pNFT, and the original will be reverted to the Original Owner.</p>
      </div>
    </div>, // used in askOwnershipAdjustmentArbitrate() - basic
    <div>
      <h3>Ownership restoration in case of loss of pNFT due to a sending to an incorrect address</h3>
      <div>
        <p>A dispute over a pNFT (protected copy of the original NFT) has arisen!</p>
        <p><b>The Claimant</b> contends that their pNFT was sent to an incorrect address. They are the party that inadvertently dispatched the pNFT but maintained control over the original NFT (Original Owner).</p>
        <p>NFT Protect has prepared a <a href={getUrl(requestId, chainId)}>case page</a> aiming to provide comprehensive information.</p>
        <p><b>The Defendant</b> might be the party that either rightfully or wrongfully took possession of the pNFT.</p>
        <p>You are tasked to review the evidence and determine, based on the Policy, whether the pNFT was mistakenly sent to an incorrect address, causing a change in pNFT ownership.</p>
        <p>If it is confirmed that the pNFT was indeed sent to an incorrect address, NFT Protect will burn the pNFT, and the original will be reverted to the Original Owner.</p>
        <p>If there was no mistake in sending, the pNFT will remain with the Defendant.</p>
      </div>
    </div>, // used in askOwnershipRestoreArbitrate() - basic
    <div>
      <h3>Ownership restoration in case of loss of pNFT in phishing attack</h3>
      <div>
        <p>A dispute over a pNFT (protected copy of the original NFT) has arisen!</p>
        <p><b>The Claimant</b> alleges the loss of their pNFT due to a phishing attack. They retained control over the original NFT (Original Owner) but lost the pNFT.</p>
        <p>NFT Protect has prepared a <a href={getUrl(requestId, chainId)}>case page</a> aiming to provide comprehensive information.</p>
        <p><b>The Defendant</b> is identified as the party that either lawfully or unlawfully acquired the pNFT.</p>
        <p>You are tasked to review the evidence and determine, based on the Policy, whether a phishing attack occurred, leading to the change in pNFT ownership.</p>
        <p>If the phishing attack is confirmed, NFT Protect will burn the pNFT, and the original will be returned to the Original Owner.</p>
        <p>If no phishing attack occurred, the pNFT will remain with the Defendant.</p>
      </div>
    </div>, // used in askOwnershipRestoreArbitrate() - basic
    <div>
      <h3>Ownership restoration in case of loss of pNFT in a protocol breach</h3>
      <div>
        <p>A dispute over a pNFT (protected copy of the original NFT) has arisen.</p>
        <p><b>The Claimant</b> alleges a breach in the protocol, leading to the loss of their pNFT. </p>
        <p><b>The Respondent</b> in this scenario is the protocol itself.</p>
        <p>NFT Protect has prepared a <a href={getUrl(requestId, chainId)}>case page</a> aiming to provide comprehensive information.</p>
        <p>You are tasked to review the evidence and determine, based on the Policy, if a protocol breach indeed occurred.</p>
        <p>If the breach is confirmed, NFT Protect will burn the pNFT, and the original will be returned to the Original Owner.</p>
        <p>If no breach took place, the pNFT will remain with the Respondent.</p>
      </div>
    </div>,  // used in askOwnershipRestoreArbitrate() - basic
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

  useEffect(() => {
    // Try to load parent styles
    Array.prototype.forEach.call(window.parent.document.querySelectorAll("link[rel=stylesheet]"), function(link) {
      var newLink = document.createElement("link");
      newLink.rel  = link.rel;
      newLink.href = link.href;
      document.head.appendChild(newLink);
    });
  }, [])

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
        const requestId = await NftProtectContract.disputeToRequest(localDisputeId)
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

  if (!requestId || !parameters) return <Card loading />

  return (
    <>
      <img src='header.svg' width='100%' title='NFT Protect'/>
      { (metaEvidenceType !== undefined) ?
        getContent(requestId, parameters.arbitrableChainID, metaEvidenceType) :
        <a
          href={ getUrl(requestId, parameters?.arbitrableChainID) }
          target="_blank"
          rel="noopener noreferrer"
        >
          Open NFT Protect request page
        </a>
      }
    </>
  )
}
export default RequestLink
