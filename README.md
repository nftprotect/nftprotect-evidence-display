<p align="center">
  <b style="font-size: 32px;">NFTProtect Evidence Display</b>
</p>

Evidence Display for NFTProtect, according to [EIP-1497 MetaEvidence](https://github.com/ethereum/EIPs/issues/1497).

## Get Started

1.  Clone this repo.
2.  Duplicate `.env.example`, rename it to `.env` and fill in the environment variables.
3.  Run `yarn` to install dependencies and then `yarn start` to run the UI in development mode.

Remember to provide dispute data on the URL. It should be a JSON object containing the arbitrator and arbitrable addresses, the disputeID, RPC endpoint and chainID as follows:

```
?{"arbitrableContractAddress":"0xdeadbeef...","arbitratorContractAddress":"0xdeadbeef...","disputeID":"111","jsonRpcUrl":"http://localhost:8545","chainId":"1"}
```

Here is a sample encoded string that should work out of the box. Paste it as it is.

```
?%7B%22disputeID%22%3A%2295%22%2C%22chainID%22%3A100%2C%22arbitratorContractAddress%22%3A%220x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002%22%2C%22arbitratorJsonRpcUrl%22%3A%22https%3A%2F%2Frpc.gnosischain.com%22%2C%22arbitratorChainID%22%3A100%2C%22arbitrableContractAddress%22%3A%220xAeECFa44639b61d2e0A9534D918789d94A24a9DE%22%2C%22arbitrableChainID%22%3A100%2C%22arbitrableJsonRpcUrl%22%3A%22https%3A%2F%2Frpc.gnosischain.com%22%7D
```

## Deploy

This interface is meant to be deployed to IPFS.
To do so, you should:

1. Copy the `.env.example` file to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Set the appropriate environment variables.
3. Bundle the app for production:
   ```sh
   yarn build
   ```
4. Test the app by opening `index.html` and appending in the encoded parameters. Don't proceed if it doesn't work.
5. Clone this repo and follow the instructions: https://github.com/kleros/ipfs-upload-folder
6. The `evidenceDisplayURI` will be `/ipfs/<root_hash>/index.html`
7. Test it out first, if it works fine, you are ready to set the `evidenceDisplayInterfaceURI` field of the `metaEvidence.json`, uploading the new `metaEvidence.json` to IPFS, and emitting this path as MetaEvidence in your Arbitrable contract.
