import { useQuery } from "@airstack/airstack-react";

interface Wallet {
    addresses: string[];
    primaryDomain?: Domain | null;
    domains?: Domain[] | null;
    farcasterSocials?: Social[] | null;
    lensSocials?: Social[] | null;
    xmtp?: XMTP | null;
}
  
interface Domain {
    isPrimary: boolean;
    name: string;
    tokenNft?: TokenNft | null;
}
  
interface TokenNft {
    tokenId: string;
    address: string;
    blockchain: string;
}
  
interface Social {
    isDefault: boolean;
    blockchain: string;
    profileName: string;
    profileHandle: string;
    profileImage?: string;
    followerCount: number;
    followingCount: number;
    profileTokenId?: string;
    profileTokenAddress?: string;
    profileImageContentValue?: {
        image: {
        small: string;
    } | null;
} | null;
}
  
interface XMTP {
    isXMTPEnabled: boolean;
}
  
interface Data {
    Wallet: Wallet;
}
  
interface QueryResponse {
    data: Data | null;
    loading: boolean;
    error: Error | null;
}
  
interface Error {
    message: string;
}

const GET_SOCIAL_QUERY = `
  query GetSocial($identity: Identity!) {
    Wallet(input: {identity: $identity, blockchain: ethereum}) {
      addresses
      primaryDomain {
        name
      }
      domains {
        isPrimary
        name
        tokenNft {
          tokenId
          address
          blockchain
        }
      }
      farcasterSocials: socials(input: {filter: {dappName: {_eq: farcaster}}}) {
        isDefault
        blockchain
        profileName
        profileHandle
        profileImage
        followerCount
        followingCount
        profileTokenId
        profileTokenAddress
        profileImageContentValue {
          image {
            small
          }
        }
      }
      lensSocials: socials(input: {filter: {dappName: {_eq: lens}}}) {
        isDefault
        blockchain
        profileName
        profileHandle
        profileImage
        followerCount
        followingCount
        profileTokenId
        profileTokenAddress
        profileImageContentValue {
          image {
            small
          }
        }
      }
      xmtp {
        isXMTPEnabled
      }
    }
  }`;

  const SellerOnchainProfile = ({ sellerIdentity }: { sellerIdentity: string }) => {
    const { data, loading, error } = useQuery<Data>(GET_SOCIAL_QUERY, { identity: sellerIdentity }, { cache: true });
    console.log(data);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data || !data.Wallet) return <div>No data available.</div>;

    // Ensure addresses and all array fields handle nulls gracefully
    const addresses = data.Wallet.addresses?.join(', ') || 'No addresses available';
    const domains = data.Wallet.domains || [];
    const farcasterSocials = data.Wallet.farcasterSocials || [];
    const lensSocials = data.Wallet.lensSocials || [];

    return (
        <div>
            <div>
                <h4>Domains:</h4>
                {domains.length > 0 ? (
                    domains.map((domain, index) => (
                        <div key={index}>
                            <p>{domain.name} (Primary: {domain.isPrimary ? 'Yes' : 'No'})</p>
                        </div>
                    ))
                ) : (
                    <p>No domains available</p>
                )}
                <h4>Farcaster Socials:</h4>
                {farcasterSocials.length > 0 ? (
                    farcasterSocials.map((social, index) => (
                        <div key={index}>
                            <p>{social.profileName} - Followers: {social.followerCount}</p>
                        </div>
                    ))
                ) : (
                    <p>No Farcaster socials available</p>
                )}
                <h4>Lens Socials:</h4>
                {lensSocials.length > 0 ? (
                    lensSocials.map((social, index) => (
                        <div key={index}>
                            <p>{social.profileName} - Followers: {social.followerCount}</p>
                        </div>
                    ))
                ) : (
                    <p>No Lens socials available</p>
                )}
            </div>
        </div>
    );
};

export default SellerOnchainProfile;