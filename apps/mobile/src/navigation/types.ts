export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  AlertHistory: undefined;
  Contacts: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Emergency: undefined;
  Invites: undefined;
  BlockedUsers: undefined;
  EditProfile: undefined;
  PrivacyPolicy: undefined;
  AlertOverlay: {
    alertData: {
      alertId: string;
      type: string;
      userId: string;
      userName: string;
      userPhotoURL: string;
      lat: string;
      lng: string;
      address: string;
      customMessage: string;
    };
  };
};
