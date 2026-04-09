# 多店铺协作

## 接入流程

### 创建站点分支

1. 手动根据主环境分支(main,staging,test)创建目标站点分支(main-de,staging-fr,test-au)

`>git:(main) git checkout -b main-fr`

`>git:(main) git checkout -b main-de`

`>git:(main) git checkout -b main-es`

`>....`

2. 关联shopify店铺分支到对应站点分支

`fr.fridayparts.com <---> main-fr`

发布主题

`...`

3. 配置对应站点数据，环境等

4. 安装/配置 App