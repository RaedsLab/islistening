import { NextPageContext } from 'next'
import React from 'react'
import Head from 'next/head'
import fetch from 'isomorphic-unfetch'
import memoize from 'lodash.memoize'

import { useInterval } from '../util/hooks'

const { GOOGLE_ANALYTICS_CODE } = process.env

const hexToRgba = memoize((hex: string) => {
  if (!hex) return '#FFF'

  const bigint = parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgb(${r}, ${g}, ${b}, 0.2)`
})

const idToColor = memoize((id) => {
  let hash = 0
  if (id.length === 0) return '#FFF'
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  const rgb = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    rgb[i] = (hash >> (i * 8)) & 255
  }
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`
})

const formatTime = (ms: number) => {
  var minutes = Math.floor(ms / 60000)
  var seconds = Number(((ms % 60000) / 1000).toFixed(0))
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}

const Footer = () => (
  <div className="footer">
    Built with 💖 using{' '}
    <a href="https://nextjs.org/" target="_blank" rel="noopener">
      Next.js
    </a>
    , code on{' '}
    <a
      href="https://github.com/RaedsLab/islistening"
      target="_blank"
      rel="noopener"
    >
      Github
    </a>
  </div>
)

type Props = {
  song: any // @TODO
  isError: boolean
  progressMs: number
}

const Home = (props: Props) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isError, setIsError] = React.useState(props.isError)

  const [song, setSong] = React.useState(props.song)
  const [progressMs, setProgressMs] = React.useState(props.progressMs)
  const [progress, setProgress] = React.useState(0)

  const getPlayingSong = async () => {
    if (isLoading) return
    try {
      const res = await fetch('/api/get-spotify-current')
      const data = await res.json()

      if (data.isPlaying) {
        const time_diff =
          new Date().getTime() - new Date(data.timestamp).getTime()
        return {
          error: false,
          song: data,
          progressMs: time_diff + data.progress_ms,
        }
      }
    } catch (err) {
      return { error: true }
    }
  }

  React.useEffect(() => {
    // @ts-ignore
    window.dataLayer = window.dataLayer || []
    function gtag() {
      // @ts-ignore
      dataLayer.push(arguments)
    }
    // @ts-ignore
    gtag('js', new Date())
    // @ts-ignore
    gtag('config', GOOGLE_ANALYTICS_CODE, {
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: window.document.title,
    })
  }, [])

  useInterval(() => {
    if (song && song.isPlaying && progressMs < song.duration_ms)
      setProgressMs(progressMs + 100)
  }, 100)

  React.useEffect(() => {
    if (song) setProgress((100 * progressMs) / song.duration_ms)
  }, [song, progressMs])
  React.useEffect(() => {
    async function update() {
      setIsError(false)
      setIsLoading(true)
      const data = await getPlayingSong()
      if (data) {
        setIsError(data.error)
        setSong(data.song)
        setProgressMs(data.progressMs)
      }
      setIsLoading(false)
    }

    if (progress >= 100) {
      update()
    }
  }, [progress])

  if (isError) {
    return (
      <div className="container">
        <div className="laoding">
          <h1>Sorry</h1>
          I'm not currently listening to music, come back a bit later or visit
          my <a href="https://github.com/RaedsLab">Github</a>.
        </div>
      </div>
    )
  }
  if (!song) {
    return (
      <div className="container">
        <div className="laoding">Loading...</div>
      </div>
    )
  }
  return (
    <div>
      <Head>
        <title>What is Raed playing</title>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_CODE}`}
        ></script>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="container">
        <h1 className="heading">I'm listening to</h1>
        <div className="title">
          {song.isPlaying && <div className="live" />}
          I'm listening to
        </div>
        <div className="image-container">
          <a href={song.url} target="_blank" rel="noopener">
            <img className="image" src={song.image} alt="cover" />
          </a>
          <div className="info">
            <div className="name">{song.name}</div>
            <div className="artist">{song.artist}</div>
            {song.isPlaying && (
              <div className="progress-container">
                <div
                  style={{ width: `${progress}%` }}
                  className="progress"
                ></div>
                <div className="timer">
                  <div>{formatTime(progressMs)}</div>
                  <div>{formatTime(song.duration_ms)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
      <div
        className="background"
        style={{
          backgroundColor:
            hexToRgba(song.backgroundColor) || idToColor(song.id),
        }}
      ></div>
    </div>
  )
}

Home.getInitialProps = async ({ req }: NextPageContext) => {
  try {
    const protocol = req ? req.headers['x-forwarded-proto'] || 'http' : 'http'
    const baseUrl = req ? `${protocol}://${req.headers.host}` : ''
    const res = await fetch(baseUrl + '/api/get-spotify-current')
    const data = await res.json()

    if (data.isPlaying) {
      const time_diff =
        new Date().getTime() - new Date(data.timestamp).getTime()
      return {
        song: data,
        progressMs: time_diff + data.progress_ms,
      }
    }
    return {
      song: data,
      progressMs: 0,
    }
  } catch (err) {
    return { isLoading: false, isError: true }
  }
}

export default Home
