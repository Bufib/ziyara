export type MeetingPointCoordinate = {
  latitude: number;
  longitude: number;
};

export type MeetingPointPickerProps = {
  coordinate: MeetingPointCoordinate | null;
  fallbackCoordinate: MeetingPointCoordinate | null;
  onChange: (coordinate: MeetingPointCoordinate | null) => void;
};
