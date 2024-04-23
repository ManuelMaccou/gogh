import { useState, useEffect } from 'react';
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

interface IcebreakerData {
  profiles: Profile[];
}

interface Profile {
  profileID: string;
  walletAddress: string;
  avatarUrl: string;
  displayName: string;
  bio: string;
  location: string;
  channels: Channel[];
}

interface Channel {
  type: string;
  isVerified: boolean;
  isLocked: boolean;
  value: string;
  url: string;
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
        profileDisplayName
        profileBio
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
    const [currentView, setCurrentView] = useState('Farcaster');
    const [icebreakerData, setIcebreakerData] = useState<IcebreakerData | null>(null);

    useEffect(() => {
      const fetchSocialData = async () => {
        if (!sellerIdentity) {
          console.log("No seller identity provided");
          return;
        }
        
        try {
          const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/fname/${sellerIdentity}`);
          if (!response.ok) throw new Error('Bad network repsonse.');
          const jsonData = await response.json();
          console.log("API Data:", jsonData);

          setIcebreakerData(jsonData);          
        } catch (error) {
          console.error('Failed to fetch Icebreaker data:', error);
        }
      };
      fetchSocialData();
    }, [sellerIdentity]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data || !data.Wallet) return <div>No data available.</div>;

    const socialTypes = ['linkedin', 'github', 'twitter', 'medium', 'paragraph'];

    const renderSocialProfile = (type: string, displayName: string) => {
      if (!icebreakerData || !icebreakerData.profiles || icebreakerData.profiles.length === 0) {
        console.log(`No profiles available for type: ${type}`);
        return null;
      }

      const profile = icebreakerData?.profiles?.[0]?.channels.find(channel => channel.type === type && !channel.isLocked);
      if (!profile) {
        console.log(`No profile found or it is locked for type: ${type}`);
        return null;
      }

      console.log(`Rendering profile for ${type}:`, profile);
      
      return (
        <div className='seller-profile'>
          <img src={`/images/${type}_icon.png`} alt={`${displayName} Profile`} className='seller-pfp' />
          <div className='seller-info'>
            <p className='seller-username'>{profile.value}</p>
            <div className='message-seller'>
              <a href={profile.url} target="_blank" rel="noopener noreferrer" className='message-button'>
                View profile
              </a>
            </div>
          </div>
        </div>
      );
    };

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

    // Handler to change the current social view
  const handleIconClick = (viewType: string) => {
    console.log("Setting view type to:", viewType);

    setCurrentView(viewType);
  };
    
  // Render different content based on the state
  const renderContent = () => {
    console.log(`Current view is: ${currentView}`);
    switch(currentView) {
      case 'ENS':
          return (
            <div className='seller-profile'>
              <img src="/images/ens_icon.png" alt="Domain Icon" className='seller-pfp' />
              <div className='seller-info'>
                <p className='seller-username'>{primaryDomainName}</p>
                <p>Created Date: {formatDate(domains[0]?.createdAtBlockTimestamp)}</p>
                <div className='message-seller'>
                <a href={`https://app.ens.domains/${primaryDomainName}`} target="_blank" rel="noopener noreferrer" className='message-button'>
                    View profile
                </a>
              </div>
              </div>
            </div>
          );
      case 'Farcaster':
        return farcasterSocials.map((social, index) => (
          <div key={index} className='seller-profile'>
            <img src={social.profileImage} alt="User profile picture" className='seller-pfp' />
            <div className='seller-info'>
              <p className='seller-username'>{social.profileDisplayName}</p>
              <p className='seller-bio'>{social.profileBio}</p>
              <p>Followers: {social.followerCount}</p>
              <p>Created: {formatDate(social.profileCreatedAtBlockTimestamp)}</p>
              <div className='message-seller'>
                <a href={`https://warpcast.com/${social.profileHandle}`} target="_blank" rel="noopener noreferrer" className='message-button'>
                    View profile
                </a>
              </div>
            </div>
          </div>
        ));
      case 'Lens':
        return lensSocials.map((social, index) => (
          <div key={index} className='seller-profile'>
            <img src={social.profileImage} alt="User profile picture" className='seller-pfp' />
            <div className='seller-info'>
              <p className='seller-username'>{social.profileDisplayName}</p>
              <p className='seller-bio'>{social.profileBio}</p>
              <p>Followers: {social.followerCount}</p>
              <p>Created: {formatDate(social.profileCreatedAtBlockTimestamp)}</p>
              <div className='message-seller'>
                <a href={`https://hey.xyz/u/${social.profileHandle}`} target="_blank" rel="noopener noreferrer" className='message-button'>
                    View profile
                </a>
              </div>
            </div>
          </div>
        ));
      case 'linkedin':
        return renderSocialProfile('linkedin', 'LinkedIn');
      case 'github':
        return renderSocialProfile('github', 'GitHub');
      case 'twitter':
        return renderSocialProfile('twitter', 'Twitter');
      case 'medium':
        return renderSocialProfile('medium', 'Medium');
      case 'paragraph':
        return renderSocialProfile('paragraph', 'Paragraph');
      default:
        return <p>Select a profile to view details.</p>;
    }
  };

  return (
    <div className="onchain-profile">
      <div className="social-icons">
        {farcasterSocials.length > 0 && (
          <img 
            src="/images/farcaster_icon.png"
            alt="Farcaster Profile"
            className={`social-icon ${currentView === 'Farcaster' ? 'active' : ''}`}
            onClick={() => handleIconClick('Farcaster')}
            role="button"
            aria-pressed={currentView === 'Farcaster'}
          />
        )}
        {lensSocials.length > 0 && (
          <img 
            src="/images/lens_icon.png"
            alt="Lens Profile"
            className={`social-icon ${currentView === 'Lens' ? 'active' : ''}`}
            onClick={() => handleIconClick('Lens')}
            role="button"
            aria-pressed={currentView === 'Lens'}
          />
        )}
        {primaryDomainName && (
          <img 
            src="/images/ens_icon.png"
            alt="ENS Profile"
            className={`social-icon ${currentView === 'ENS' ? 'active' : ''}`}
            onClick={() => handleIconClick('ENS')}
            role="button"
            aria-pressed={currentView === 'ENS'}
          />
        )}
        {socialTypes.map(type => icebreakerData?.profiles?.[0]?.channels.some((channel: Channel) => channel.type === type && !channel.isLocked) && (
          <img
            key={type}
            src={`/images/${type}_icon.png`}
            alt={`${type} Profile`}
            className={`social-icon ${currentView === type ? 'active' : ''}`}
            onClick={() => handleIconClick(type)}
            role="button"
            aria-pressed={currentView === type}
          />
        ))}
      </div>
      <div className="social-card">
        {renderContent()}
      </div>
    </div>
  );
};

export default SellerOnchainProfile;