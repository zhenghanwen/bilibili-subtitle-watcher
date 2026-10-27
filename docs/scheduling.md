# 定时任务

先确认以下命令可以稳定运行：

```bash
bili-sub doctor
bili-sub run
```

## Windows 任务计划

每 2 小时运行一次：

```powershell
$action = New-ScheduledTaskAction -Execute "bili-sub.cmd" -Argument "run"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours(9) -RepetitionInterval (New-TimeSpan -Hours 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "B站字幕定时采集" -Action $action -Trigger $trigger -Settings $settings -Description "通过 Tabbit 登录态扫描 B站关注动态并归档有字幕视频"
```

如果任务计划找不到 `bili-sub.cmd`，使用绝对路径。例如：

```powershell
$cli = "C:\Users\<you>\AppData\Roaming\npm\bili-sub.cmd"
$action = New-ScheduledTaskAction -Execute $cli -Argument "run"
```

也可以直接使用 Node 和项目路径：

```powershell
$script = "D:\projects\bilibili-subtitle-watcher\scripts\bili-sub.mjs"
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "`"$script`" run"
```

### 每天固定时间运行

每天 9 点：

```powershell
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00
Register-ScheduledTask -TaskName "B站字幕每日采集" -Action $action -Trigger $trigger -Settings $settings
```

### 查看和删除任务

```powershell
Get-ScheduledTask -TaskName "B站字幕定时采集"
Unregister-ScheduledTask -TaskName "B站字幕定时采集" -Confirm:$false
```

## macOS / Linux cron

打开 crontab：

```bash
crontab -e
```

每 2 小时运行一次：

```cron
0 */2 * * * /usr/local/bin/bili-sub run >> "$HOME/.bili-sub/cron.log" 2>&1
```

如果需要指定配置：

```cron
0 */2 * * * BILI_SUB_CONFIG="$HOME/bilibili-subtitle-watcher/bili-sub.config.json" /usr/local/bin/bili-sub run >> "$HOME/.bili-sub/cron.log" 2>&1
```

## 建议频率

- 初期：每天 1–2 次，或每 4 小时一次。
- 稳定后：每 2 小时一次。
- 不建议低于 30 分钟一次。
- `maxPerRun` 建议 3–10，`delayMs` 不低于 2000。

## 日志和状态

- 最近一次运行摘要：`data/last-run.json`
- 视频状态：`data/state.json`
- 定时任务应保留日志，方便排查登录态过期或 Tabbit 未启动问题。

## 登录态失效

定时任务不会自动处理扫码。若 `doctor` 返回 `AUTH_REQUIRED`，手动运行：

```bash
bili-sub login
```

登录后定时任务即可恢复。
