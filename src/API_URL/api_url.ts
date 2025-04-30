export const api_url = (lat: number, lot: number, date_str: string, hours: number): any => {
    return `https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat=${lat}&lon=${lot}&fields=tc,rh,slp,rain,ws10m,wd10m,cloudlow,cloudhigh&date=${date_str}&hour=${hours}&duration=1`
}

export const axios_api = (URL_: any, token: string,  axios: any) => {
   return axios.get(URL_, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}