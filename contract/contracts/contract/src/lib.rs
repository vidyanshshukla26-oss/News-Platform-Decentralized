#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Article {
    pub id: u64,
    pub title: String,
    pub content: String,
    pub author: Address,
    pub timestamp: u64,
    pub upvotes: u32,
    pub downvotes: u32,
}

#[contracttype]
pub enum DataKey {
    Article(u64),
    ArticleIds,
    Upvoters(u64),
    Downvoters(u64),
    NextId,
}

#[contract]
pub struct NewsPlatform;

#[contractimpl]
impl NewsPlatform {
    /// Submit a new article - permissionless, anyone can submit
    pub fn submit_article(env: Env, title: String, content: String, author: Address) -> u64 {
        author.require_auth();

        let article_id = Self::get_next_id(env.clone());
        let timestamp = env.ledger().timestamp();

        let article = Article {
            id: article_id,
            title,
            content,
            author,
            timestamp,
            upvotes: 0,
            downvotes: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Article(article_id), &article);

        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ArticleIds)
            .unwrap_or_else(|| Vec::new(&env));
        ids.push_back(article_id);
        env.storage().persistent().set(&DataKey::ArticleIds, &ids);

        let mut counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::NextId)
            .unwrap_or(1);
        counter += 1;
        env.storage().persistent().set(&DataKey::NextId, &counter);

        article_id
    }

    /// Upvote an article - permissionless, anyone can vote
    pub fn upvote(env: Env, article_id: u64, voter: Address) {
        voter.require_auth();
        Self::check_article_exists(env.clone(), article_id);

        let upvoters_key = DataKey::Upvoters(article_id);
        let mut upvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&upvoters_key)
            .unwrap_or_else(|| Map::new(&env));

        assert!(
            !upvoters.get(voter.clone()).unwrap_or(false),
            "already upvoted"
        );

        upvoters.set(voter.clone(), true);
        env.storage().persistent().set(&upvoters_key, &upvoters);

        let mut article: Article = env
            .storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .unwrap();
        article.upvotes += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Article(article_id), &article);
    }

    /// Downvote an article - permissionless, anyone can vote
    pub fn downvote(env: Env, article_id: u64, voter: Address) {
        voter.require_auth();
        Self::check_article_exists(env.clone(), article_id);

        let downvoters_key = DataKey::Downvoters(article_id);
        let mut downvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&downvoters_key)
            .unwrap_or_else(|| Map::new(&env));

        assert!(
            !downvoters.get(voter.clone()).unwrap_or(false),
            "already downvoted"
        );

        downvoters.set(voter.clone(), true);
        env.storage().persistent().set(&downvoters_key, &downvoters);

        let mut article: Article = env
            .storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .unwrap();
        article.downvotes += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Article(article_id), &article);
    }

    /// Remove upvote - permissionless, anyone can remove their vote
    pub fn remove_upvote(env: Env, article_id: u64, voter: Address) {
        voter.require_auth();
        Self::check_article_exists(env.clone(), article_id);

        let upvoters_key = DataKey::Upvoters(article_id);
        let mut upvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&upvoters_key)
            .unwrap_or_else(|| Map::new(&env));

        assert!(upvoters.get(voter.clone()).unwrap_or(false), "not upvoted");

        upvoters.remove(voter.clone());
        env.storage().persistent().set(&upvoters_key, &upvoters);

        let mut article: Article = env
            .storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .unwrap();
        article.upvotes = article.upvotes.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::Article(article_id), &article);
    }

    /// Remove downvote - permissionless, anyone can remove their vote
    pub fn remove_downvote(env: Env, article_id: u64, voter: Address) {
        voter.require_auth();
        Self::check_article_exists(env.clone(), article_id);

        let downvoters_key = DataKey::Downvoters(article_id);
        let mut downvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&downvoters_key)
            .unwrap_or_else(|| Map::new(&env));

        assert!(
            downvoters.get(voter.clone()).unwrap_or(false),
            "not downvoted"
        );

        downvoters.remove(voter.clone());
        env.storage().persistent().set(&downvoters_key, &downvoters);

        let mut article: Article = env
            .storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .unwrap();
        article.downvotes = article.downvotes.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::Article(article_id), &article);
    }

    /// Get a single article by ID - permissionless read
    pub fn get_article(env: Env, article_id: u64) -> Article {
        env.storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .expect("article not found")
    }

    /// Get all articles (paginated) - permissionless read
    pub fn get_articles(env: Env, offset: u32, limit: u32) -> Vec<Article> {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ArticleIds)
            .unwrap_or_else(|| Vec::new(&env));
        let total = ids.len();

        let mut articles: Vec<Article> = Vec::new(&env);
        let start = offset.min(total);
        let end = (offset + limit).min(total);

        let mut i = start;
        while i < end {
            let id = ids.get(i).unwrap();
            let article: Article = env
                .storage()
                .persistent()
                .get(&DataKey::Article(id))
                .unwrap();
            articles.push_back(article);
            i += 1;
        }
        articles
    }

    /// Get articles sorted by score (upvotes - downvotes) - permissionless read
    pub fn get_top_articles(env: Env, offset: u32, limit: u32) -> Vec<Article> {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ArticleIds)
            .unwrap_or_else(|| Vec::new(&env));
        let total = ids.len();

        if total == 0 {
            return Vec::new(&env);
        }

        let mut scored_articles: Vec<(i64, Article)> = Vec::new(&env);

        let mut i = 0u32;
        while i < total {
            let id = ids.get(i).unwrap();
            let article: Article = env
                .storage()
                .persistent()
                .get(&DataKey::Article(id))
                .unwrap();
            let score = article.upvotes as i64 - article.downvotes as i64;
            scored_articles.push_back((score, article));
            i += 1;
        }

        let mut j = 0u32;
        while j < scored_articles.len() {
            let mut k = j + 1;
            while k < scored_articles.len() {
                let a = scored_articles.get(j).unwrap();
                let b = scored_articles.get(k).unwrap();
                if b.0 > a.0 {
                    scored_articles.set(j, b.clone());
                    scored_articles.set(k, a.clone());
                }
                k += 1;
            }
            j += 1;
        }

        let mut result: Vec<Article> = Vec::new(&env);
        let start = offset.min(total);
        let end = (offset + limit).min(total);

        let mut idx = start;
        while idx < end {
            let (_, article) = scored_articles.get(idx).unwrap();
            result.push_back(article.clone());
            idx += 1;
        }
        result
    }

    /// Get total article count - permissionless read
    pub fn get_article_count(env: Env) -> u32 {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ArticleIds)
            .unwrap_or_else(|| Vec::new(&env));
        ids.len()
    }

    /// Get net score for an article - permissionless read
    pub fn get_score(env: Env, article_id: u64) -> i64 {
        let article: Article = env
            .storage()
            .persistent()
            .get(&DataKey::Article(article_id))
            .expect("article not found");
        article.upvotes as i64 - article.downvotes as i64
    }

    /// Check if user has voted on an article - permissionless read
    pub fn has_voted(env: Env, article_id: u64, voter: Address) -> (bool, bool) {
        Self::check_article_exists(env.clone(), article_id);

        let upvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Upvoters(article_id))
            .unwrap_or_else(|| Map::new(&env));
        let downvoters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Downvoters(article_id))
            .unwrap_or_else(|| Map::new(&env));

        (
            upvoters.get(voter.clone()).unwrap_or(false),
            downvoters.get(voter).unwrap_or(false),
        )
    }

    fn get_next_id(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::NextId)
            .unwrap_or(1)
    }

    fn check_article_exists(env: Env, article_id: u64) {
        assert!(
            env.storage()
                .persistent()
                .has(&DataKey::Article(article_id)),
            "article not found"
        );
    }
}

mod test;
