import { useQuery } from "@airstack/airstack-react";

interface Wallet {
  addresses: string[];
  primaryDomain?: Domain | null;
  domains?: Domain[] | null;
  farcasterSocials?: Social[] | null;
  lensSocials?: Social[] | null;
}
  
interface Domain {
  isPrimary: boolean;
  name: string;
  tokenNft?: TokenNft | null;
  createdAtBlockTimestamp?: string;
}
  
interface TokenNft {
  tokenId: string;
  address: string;
  blockchain: string;
}
  
interface Social {
  isDefault: boolean;
  blockchain: string;
  profileBio: string;
  profileName: string;
  profileDisplayName: string;
  profileHandle: string;
  profileImage?: string;
  followerCount: number;
  followingCount: number;
  profileTokenId?: string;
  isFarcasterPowerUser?: boolean;
  profileTokenAddress?: string;
  profileCreatedAtBlockTimestamp?: string;
  profileImageContentValue?: {
    image: {
      small: string;
    } | null;
  } | null;
}
  
// interface XMTP {
  // isXMTPEnabled: boolean;
// }
  
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
        createdAtBlockTimestamp
        tokenNft {
          tokenId
          address
          blockchain
        }
      }
      farcasterSocials: socials(input: {filter: {dappName: {_eq: farcaster}}}) {
        isDefault
        blockchain
        profileBio
        profileName
        profileHandle
        profileDisplayName
        profileCreatedAtBlockTimestamp
        profileImage
        followerCount
        followingCount
        profileTokenId
        profileTokenAddress
        isFarcasterPowerUser
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
        profileCreatedAtBlockTimestamp
        profileImageContentValue {
          image {
            small
          }
        }
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
    const primaryDomainName = data.Wallet.primaryDomain?.name || 'No ENS available';

    function formatDate(isoDateString?: string): string {
      if (!isoDateString) {
        return "Date not available";
      }
      return new Date(isoDateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    
    return (
          <div className="onchain-profile">
            <div className="social-card">
              <h4>ENS:</h4>
              {data.Wallet.primaryDomain ? (
                <div>
                <img 
                  src="/images/ens_mark_primary.png" 
                  alt="Domain Icon" 
                  style={{ 
                    marginRight: '8px', 
                    verticalAlign: 'middle', 
                    width: '24px',
                    height: '24px'
                  }} 
                />
                  {data.Wallet.primaryDomain.name}
                  <p>Created Date: {formatDate(domains[0]?.createdAtBlockTimestamp)}</p>
                </div>
              ) : (
                <p>No ENS available</p>
              )}
            </div>
            <div className="social-card">
              <h4>Farcaster:</h4>
              {farcasterSocials.length > 0 ? (
                  farcasterSocials.map((social, index) => (
                      <div key={index}>
                        <div className='seller-profile'>
                          <img src={social.profileImage} alt="User profile picture" className='seller-pfp' />
                          <div className='seller-info'>
                              <p className='seller-username'>{social.profileDisplayName}</p>
                              <p className='seller-bio'>{social.profileBio}</p>
                              <p>Followers: {social.followerCount}</p>
                              <p>Created: {formatDate(social?.profileCreatedAtBlockTimestamp)}</p>
                          </div>
                      </div>
                      <div className='message-seller'>
                          <a href={`https://warpcast.com/${social.profileHandle}`} target="_blank" rel="noopener noreferrer" className='message-button'>
                              View profile
                          </a>
                      </div>
                    </div>
                  ))
              ) : (
                  <p>No Farcaster socials available</p>
              )}
            </div>
            <div className="social-card">
              <h4>Lens:</h4>
              {lensSocials.length > 0 ? (
                  lensSocials.map((social, index) => (
                    <div key={index}>
                    <div className='seller-profile'>
                      <img src={social.profileImage} alt="User profile picture" className='seller-pfp' />
                      <div className='seller-info'>
                          <p className='seller-username'>{social.profileDisplayName}</p>
                          <p className='seller-bio'>{social.profileBio}</p>
                          <p>Followers: {social.followerCount}</p>
                          <p>Created: {formatDate(social?.profileCreatedAtBlockTimestamp)}</p>
                      </div>
                  </div>
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