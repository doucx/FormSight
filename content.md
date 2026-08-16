## [WIP] HSV 滑块改成左右分布

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~typescript.old
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {/* C 节点颜色 */}
        <div className="space-y-3 pb-3 border-b border-slate-200/60">
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={cH}
            max={360}
            unit="°"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cH}
            userVal={cH}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
          <HsvTrackSlider
            label="S"
            gradient={cSatGradient}
            val={cS}
            max={100}
            unit="%"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cS}
            userVal={cS}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
          <HsvTrackSlider
            label="V"
            gradient={cValGradient}
            val={cV}
            max={100}
            unit="%"
            targetHSV={colorC}
            difficultyLevel={difficultyLevel}
            showAnswer={false}
            targetVal={cV}
            userVal={cV}
            allUserHSV={colorC}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={false}
          />
        </div>

        {/* D 节点颜色 */}
        <div className="space-y-3">
          <HsvTrackSlider
            label="H"
            gradient={hueGradient}
            val={userH}
            max={360}
            unit="°"
            targetHSV={targetD}
            difficultyLevel={difficultyLevel}
            showAnswer={showAnswer}
            targetVal={targetD[0]}
            userVal={userAnswer?.userD?.[0] ?? userH}
            isHit={userAnswer?.isHit}
            onValChange={() => {}}
            allUserHSV={[userH, userS, userV]}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
          <HsvTrackSlider
            label="S"
            gradient={satGradient}
            val={userS}
            max={100}
            unit="%"
            targetHSV={targetD}
            difficultyLevel={difficultyLevel}
            showAnswer={showAnswer}
            targetVal={targetD[1]}
            userVal={userAnswer?.userD?.[1] ?? userS}
            isHit={userAnswer?.isHit}
            onValChange={() => {}}
            allUserHSV={[userH, userS, userV]}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
          <HsvTrackSlider
            label="V"
            gradient={valGradient}
            val={userV}
            max={100}
            unit="%"
            targetHSV={targetD}
            difficultyLevel={difficultyLevel}
            showAnswer={showAnswer}
            targetVal={targetD[2]}
            userVal={userAnswer?.userD?.[2] ?? userV}
            isHit={userAnswer?.isHit}
            onValChange={() => {}}
            allUserHSV={[userH, userS, userV]}
            disabled={true}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        </div>
      </div>
~~~~~
~~~~~typescript.new
      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：C 节点颜色 */}
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
            />
          </div>

          {/* 右侧：D 节点颜色 */}
          <div className="space-y-3">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[0]}
              userVal={userAnswer?.userD?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[1]}
              userVal={userAnswer?.userD?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetD}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetD[2]}
              userVal={userAnswer?.userD?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={() => {}}
              allUserHSV={[userH, userS, userV]}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          </div>
        </div>
      </div>
~~~~~
