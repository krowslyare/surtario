/** Decorative pantry still life. All packaging and labels are illustrative. */
export default function MarketIllustration() {
  return (
    <div className="market-art" aria-hidden="true">
      <svg viewBox="0 0 520 390" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grain-pattern"
            width="26"
            height="30"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-16)"
          >
            <ellipse cx="10" cy="12" rx="2.5" ry="7" fill="#C5C39B" />
          </pattern>
          <linearGradient
            id="bottle-glass"
            x1="115"
            x2="181"
            y1="140"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#698E61" />
            <stop offset=".4" stopColor="#9DAE74" />
            <stop offset="1" stopColor="#597B52" />
          </linearGradient>
        </defs>
        <ellipse cx="266" cy="330" rx="207" ry="32" fill="#DAD9ED" />
        <path d="M51 309L285 253L484 307L253 369L51 309Z" fill="#FDFDF8" />
        <path d="M51 309V322L253 382V369L51 309Z" fill="#D9DAD0" />
        <path d="M253 369L484 307V320L253 382V369Z" fill="#E8E8DC" />
        <g className="art-bottle">
          <path
            d="M118 83H149V129C149 142 170 148 176 168L180 287C180 305 105 309 105 290L108 168C108 148 118 143 118 129V83Z"
            fill="url(#bottle-glass)"
          />
          <path
            d="M117 81C117 75 149 74 150 80L150 100C140 104 127 104 117 101V81Z"
            fill="#383B2E"
          />
          <path
            d="M112 180C128 185 157 185 177 180L179 258C159 267 126 267 107 262L112 180Z"
            fill="#E9EDCF"
          />
          <path
            d="M140 212C133 187 115 195 123 206C127 212 134 214 140 212ZM140 218C141 194 159 197 156 209C153 215 147 219 140 218Z"
            fill="#69835A"
          />
          <path d="M139 231V206" stroke="#69835A" strokeWidth="2" />
          <text
            x="143"
            y="248"
            textAnchor="middle"
            fill="#43523E"
            fontSize="10"
            fontWeight="700"
          >
            ACEITE
          </text>
          <path
            d="M118 151C115 175 115 180 115 183"
            stroke="#D5DCC0"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".65"
          />
        </g>
        <g className="art-rice">
          <path
            d="M195 60L316 47L326 75L344 290Q293 319 184 301L186 94Z"
            fill="#F2F0D9"
          />
          <path d="M316 47L342 59L366 283L344 290L326 75Z" fill="#DEDFC1" />
          <path d="M196 60L316 47L326 75L186 94Z" fill="#E1E1C4" />
          <path
            d="M198 65L313 53M193 75L317 62"
            stroke="#B9BCAE"
            strokeWidth="1.5"
          />
          <path d="M192 104L326 88L336 181L188 194Z" fill="#37375C" />
          <text x="206" y="132" fill="#F5F2D9" fontSize="12" fontWeight="500">
            La despensa
          </text>
          <text
            x="204"
            y="165"
            fill="#F5F2D9"
            fontSize="32"
            fontWeight="700"
            letterSpacing="-1.5"
          >
            Arroz
          </text>
          <text x="276" y="177" fill="#CDCBE9" fontSize="10">
            extra
          </text>
          <path
            d="M191 210L337 195L341 276Q265 296 187 281Z"
            fill="url(#grain-pattern)"
          />
          <path d="M283 264H326V284H283Z" fill="#F2F0D9" />
          <text
            x="304"
            y="278"
            textAnchor="middle"
            fill="#37375C"
            fontSize="11"
            fontWeight="700"
          >
            18 kg
          </text>
        </g>
        <g className="art-tomato">
          <path
            d="M367 274C358 230 408 215 429 248C453 232 477 267 456 296C438 324 381 317 367 274Z"
            fill="#D77158"
          />
          <path
            d="M424 250L406 240L418 259L400 258L422 267L436 253L437 242L427 252L424 250Z"
            fill="#667753"
          />
          <path
            d="M385 257C377 261 376 272 380 278"
            stroke="#E8A28C"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(305 310) rotate(-12)">
          <rect width="108" height="47" rx="3" fill="#37375C" />
          <text x="12" y="18" fill="#D7D5EC" fontSize="9">
            Cada fuente cuenta.
          </text>
          <text x="12" y="35" fill="white" fontSize="12" fontWeight="600">
            Elegir con criterio.
          </text>
        </g>
        <path
          d="M54 165H79M67 153V177"
          stroke="#A8A4C5"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="421" cy="140" r="5" stroke="#A8A4C5" strokeWidth="2" />
        <path
          d="M389 76L394 65L405 70"
          stroke="#A8A4C5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="art-caption">Una mirada más clara a tu despensa.</span>
    </div>
  );
}
