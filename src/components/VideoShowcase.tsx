import { useRef, useState } from 'react'
import { Play, Upload } from 'lucide-react'
import { FadeIn } from './animations/FadeIn'
import type { VideoItem } from '../types'

export function VideoShowcase({ videos }: { videos: VideoItem[] }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <section id="videos" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            视频作品
          </h2>
          <p className="text-stone-500 text-lg mb-12 max-w-2xl">
            以下是我的视频作业展示，点击任意视频即可播放。
          </p>
        </FadeIn>

        {videos.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-16 text-center">
              <Upload className="mx-auto text-stone-300 mb-4" size={40} />
              <p className="text-stone-400">暂未上传视频，请通过后台管理添加。</p>
            </div>
          </FadeIn>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video, idx) => (
              <FadeIn key={video.id} delay={idx * 0.1}>
                <div
                  className="group relative rounded-2xl overflow-hidden bg-stone-100 cursor-pointer border border-stone-200 hover:border-accent/30 transition-all duration-300 hover:shadow-lg"
                  onClick={() =>
                    setActiveVideo(activeVideo === video.id ? null : video.id)
                  }
                >
                  {activeVideo === video.id ? (
                    <video
                      ref={videoRef}
                      src={video.videoUrl}
                      controls
                      autoPlay
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <div className="aspect-video relative flex items-center justify-center">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300" />
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                          <Play size={26} className="text-accent ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
